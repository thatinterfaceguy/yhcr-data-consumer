$(document).ready(function () {

    $(".patient-records").sortable({
        handle: ".panel-heading",
        items: "div.panel",
        tolerance: "pointer"
    });

    $('.patient-records .panel-heading span.remove').on('click', function () {

        var target = $(this).closest('.panel');

        target.fadeOut(300, function () {
            $(this).remove();
        });

    });

    $(window).scroll(function () {
        if ($(this).scrollTop() < 200) {
            $('#smoothscroll').fadeOut();
        } else {
            $('#smoothscroll').fadeIn();
        }
    });

    $('#smoothscroll').on('click', function () {
        $('html, body').animate({scrollTop: 0}, 'fast');
        return false;
    });

    $('#timeline-example').ccriTimeline();

    // CCRI
    var baseUrl = "https://data.developer.nhs.uk/ccri-fhir/STU3/";

    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function patientData() {
        //Execute a patient search against the CCRI and return a bundle containing:
        //Patient resource, General Practitioner and General Practice
        //HINT: _include
        return $.ajax({
            url: baseUrl + "Patient?_id=1181&_include=Patient:general-practitioner&_include=Patient:organization",
            type: 'GET',
            success: function (data) {
                var bundle = data;

                //Expectation here is that we receive a Bundle containing 3 resources:
                //1 Patient
                //2 Organization
                //3 General Practitioner

                //Patient
                var patient = bundle.entry[0].resource;

                // Name
                $("#patient-name").html(patient.name[0].family + ', ' + patient.name[0].given[0] + ' (' + patient.name[0].prefix[0] + ')');

                //NHS Number
                var nhsNumber = "";
                for(i=0;i<patient.identifier.length;i++)
                {
                    var id = patient.identifier[i];
                    if(id.extension !== undefined && id.system == "https://fhir.nhs.uk/Id/nhs-number")
                    {
                        nhsNumber = id.value.substring(0,3) + "-" + id.value.substring(3,6) + "-" + id.value.substring(6,10);
                        break;
                    }
                }
                $("#patient-nhs").html("NHS Number: " + nhsNumber);

                // Complete age
                var age = getAge(formatDateUS(patient.birthDate));
                $(".patient-age").html(age);

                // Date of birth
                var date = new Date(patient.birthDate);
                var stringDate = date.getDate() + '-' + monthNames[date.getMonth()] + '-' + date.getFullYear();
                $(".patient-dob").html(stringDate);

                // Age in years
                $(".patient-age-years").html(getAgeInYears(patient.birthDate));

                // Gender
                var gender = patient.gender;
                $("#patient-gender").html(gender.substring(0, 1) + gender.substring(1).toLowerCase());


                //Managing Organization
                var gpPrac = bundle.entry[1].resource;
                $("#patient-gpprac").html(gpPrac.name);

                //General Practitioner
                var gp = bundle.entry[2].resource;
                $("#patient-gp").html(gp.name[0].prefix[0] + "." + gp.name[0].given[0] + " " + gp.name[0].family + " (" + gp.identifier[0].value + ")");
            }
        });
    }

    function getVitals() {
        //Execute a Observation search against the CCRI and return a bundle containing:
        //All Observations for patient/1181 where category code = vital-signs
        //HINT: category code for vital signs = http://hl7.org/fhir/observation-category|vital-signs
        return $.ajax({
            url: baseUrl + "Observation?patient=Patient/1181&category=vital-signs&_count=50",
            type: 'GET',
            success: function (data) {
                var bundle = data;

                //Expectation here is that we receive a Bundle of vital sign observation resources
                var obs = bundle.entry;
                var weight;
                var height;

                //Sort the array in date descending (most recent first)
                //CCRI doesn't seem to support _sort=-date (of course may not yield correct results but for example is fine)
                obs.sort(function (a,b) {
                    return new Date(a.resource.effectiveDateTime) - new Date(b.resource.effectiveDateTime) ;
                });


                //Loop over the obs and nasty switch to display appropriately...
                for(i=0;i<obs.length;i++)
                {
                    var ob = obs[i].resource;
                    switch(ob.code.coding[0].code) {
                        case "27113001": //Weight
                            console.log("Weight");
                            weight = ob.valueQuantity.value;
                            $('.weight-placeholder-value').text(ob.valueQuantity.value);
                            $('.weight-placeholder-unit').text(ob.valueQuantity.unit);
                          break;
                        case "50373000": //Height
                            console.log("Height");
                            height = ob.valueQuantity.value;
                            $('.height-placeholder-value').text(ob.valueQuantity.value);
                            $('.height-placeholder-unit').text(ob.valueQuantity.unit);

                            var gender = $('#patient-gender').text().toLowerCase();

                            if (gender) {
                                var picture = $('.patient-height-image');
                                var src = "img/body-blank-" + gender + ".png";
                                picture.attr("src", src);
                            }

                          break;
                        case "75367002": //Blood Pressure
                            console.log("BP");
                            var systolic = ob.component[0].code.coding[0].code == "72313002" ? ob.component[0].valueQuantity.value : ob.component[1].valueQuantity.value;
                            var diastolic = ob.component[0].code.coding[0].code == "1091811000000102" ? ob.component[0].valueQuantity.value : ob.component[1].valueQuantity.value;
                            var bp = systolic + "/" + diastolic + " " + ob.component[1].valueQuantity.unit;
                            $('.last-bp').text(bp);
                            $('.last-bp-date').text(formatDate(ob.effectiveDateTime, true));
                            break;
                        case "103228002": //Blood oxygen saturation
                            console.log("Sp02");
                            var sats = ob.valueQuantity.value;
                            $('.last-spo2').text(sats + "%");
                            $('.bar-spo2').css('width', sats + "%");
                            break;
                        default:
                            console.log("default: " + ob.code.coding[0].code);
                      }
                }
                //Calculate BMI using basic weight kg/height m squared
                var bmi = parseFloat(weight/((height/100)*(height/100))).toFixed(2) + " kg/m2";
                $('.patient-bmi').html(bmi);
            }
        });
}

    function getBloodPressures() {
        //Chart blood pressure readings by fetching obs
        //Does CCRI support elements??? If not say that could be used here and give example.
        var colors = ['#ED5565', '#DA4453'];
        return $.ajax({
            url: baseUrl + "Observation?patient=Patient/1181&code=75367002",
            type: 'GET',
            success: function (res) {
                
                var entries = res.entry;

                //Create flat collection of systolic, diastolic, value, date
                var bloodPressures = [];
                for(var i=0;i<entries.length;i++)
                {
                    var ob = entries[i].resource;
                    for(var j=0;j<ob.component.length;j++)
                    {
                        var comp = ob.component[j];
                        var systolic, diastolic, unit, date;

                        unit = comp.valueQuantity.unit;

                        date = new Date(ob.effectiveDateTime).getTime();

                        if(comp.code.coding[0].code == "72313002")
                        {
                            systolic = comp.valueQuantity.value;
                        }
                        if(comp.code.coding[0].code == "1091811000000102")
                        {
                            diastolic = comp.valueQuantity.value;
                        }

                        bloodPressures.push(
                            {
                                "date":date,
                                "systolic":systolic,
                                "diastolic":diastolic,
                                "unit":unit
                            }
                        );
                    }
                    
                }

                new Morris.Area({
                    element: 'blood-pressures',
                    data: bloodPressures.reverse(),
                    xkey: 'date',
                    ykeys: ['systolic', 'diastolic'],
                    lineColors: colors,
                    labels: ['Systolic', 'Diastolic'],
                    lineWidth: 2,
                    pointSize: 3,
                    hideHover: true,
                    behaveLikeLine: true,
                    smooth: false,
                    resize: true,
                    xLabels: "day",
                    xLabelFormat: function (x) {
                        var date = new Date(x);

                        return (date.getDate() + '-' + monthNames[date.getMonth()]);
                    },
                    dateFormat: function (x) {

                        return (formatDate(x, false));
                    }
                });

                //last measurement
                var bp = bloodPressures[bloodPressures.length - 1].systolic + "/" + bloodPressures[bloodPressures.length - 1].diastolic + " " + bloodPressures[bloodPressures.length - 1].unit;
                $('.last-bp').text(bp);
                $('.last-bp-date').text(formatDate(bloodPressures[bloodPressures.length - 1].date, true));
            }
        });
    }

    function getPulse() {
        return $.ajax({
            url: baseUrl + "Observation?patient=Patient/1181&code=364075005",
            type: 'GET',
            success: function (res) {

                var entries = res.entry;

                //Create flat collection of heart rate value (pulse), date
                var heartRateReadings = [];
                for(var i=0;i<entries.length;i++)
                {
                    var ob = entries[i].resource;
                    var pulse, unit, date;

                    unit = ob.valueQuantity.unit;
                    date = new Date(ob.effectiveDateTime).getTime();
                    pulse = ob.valueQuantity.value;
                        
                    heartRateReadings.push(
                        {
                            "date":date,
                            "pulse":pulse,
                            "unit":unit
                        }
                    );
                }

                new Morris.Area({
                    element: 'pulse',
                    data: heartRateReadings.reverse(),
                    xkey: 'date',
                    ykeys: ['pulse'],
                    lineColors: ['#A0D468', '#8CC152'],
                    labels: ['Pulse'],
                    lineWidth: 2,
                    pointSize: 3,
                    hideHover: true,
                    behaveLikeLine: true,
                    smooth: false,
                    resize: true,
                    xLabels: "day",
                    xLabelFormat: function (x) {
                        var date = new Date(x);
                        return (date.getDate() + '-' + monthNames[date.getMonth()]);
                    },
                    dateFormat: function (x) {
                        return (formatDate(x, false));
                    }
                });

                //last measurement
                var p = heartRateReadings[heartRateReadings.length - 1].pulse + " " + heartRateReadings[heartRateReadings.length - 1].unit;
                $('.last-pulse').text(p);
                $('.last-pulse-date').text(formatDate(heartRateReadings[heartRateReadings.length - 1].date, true));
            }
        });
    }

    //Exercise 1 - Fetch all clinically active AllergyIntolerance resources for Patient/1181
    function getAllergies() {
        return $.ajax({
            url: baseUrl + "<!-- TODO: TYPE SEARCH QUERY STRING HERE-->",
            type: 'GET',
            success: function (res) {
                //Crude de-dupe based on snomed (NOTE: THIS WOULD NEVER DO FOR SOFTWARE INTENDED FOR REAL LIFE USE)...
                var currSnomed = ""
                var displayed = [];
                for (var i = 0; i < res.entry.length; i++) {
                    var allergy = res.entry[i].resource;
                    currSnomed = allergy.code.coding[0].code;
                    if(displayed.length == 0 || (displayed.length > 0 && displayed.indexOf(currSnomed) == -1))
                    {
                        $('ul.allergies').append('<li>' + allergy.code.coding[0].display + '</li>');
                        displayed.push(currSnomed);
                    }
                }
                displayed = null;
            }
        });
    }

    //Execute a search against the CCRI and return a bundle containing:
    //All active Meds for patient/1181
    function getMedications() {
        return $.ajax({
            url: baseUrl + "MedicationStatement?status=active&patient=Patient/1181",
            type: 'GET',
            success: function (res) {
                //Crude de-dupe
                var currMedRef = "";
                var displayed = [];
                for (var i = 0; i < res.entry.length; i++) {
                    var medStatement = res.entry[i].resource;
                    currMedRef = medStatement.medicationReference.reference;
                    if(displayed.length == 0 || (displayed.length > 0 && displayed.indexOf(currMedRef) == -1))
                    {
                        $('ul.medications').append('<li>' + medStatement.medicationReference.display.substring(0, medStatement.medicationReference.display.indexOf("(")-1) + '</li>');
                        displayed.push(currMedRef);
                    }
                }
                displayed = null;
            }
        });
    }

    //Execute a search against the CCRI and return a bundle containing:
    //All active conditions for patient/1181
    function getProblems() {
        return $.ajax({
            url: baseUrl + "Condition?clinical-status=active&patient=Patient/1181",
            type: 'GET',
            success: function (res) {
                 //Crude de-dupe
                 var currConditionRef = "";
                 var displayed = [];
                for (var i = 0; i < res.entry.length; i++) {
                    var condition = res.entry[i].resource;
                    currConditionRef = condition.code.coding[0].code;
                    if(displayed.length == 0 || (displayed.length > 0 && displayed.indexOf(currConditionRef) == -1))
                    {
                        $('ul.problems').append('<li>' + condition.code.coding[0].display + '</li>');
                        displayed.push(currConditionRef);
                    }
                }
                displayed=null;
            }
        });
    }

    //Execute a search against the CCRI and return a bundle containing:
    //All lab observations for patient/1181
    function getLabs() {
        return $.ajax({
            url: baseUrl + "Observation?patient=Patient/1181&category=laboratory",
            type: 'GET',
            success: function (data) {

                var obs = data.entry;

                var html = "";

                for (var i=0; i<obs.length; i++){
                    var ob = obs[i].resource;

                    html += '<tr>';

                    if(ob.component === undefined)
                    {
                        html += '<td>' + ob.code.coding[0].display + '</td>'+
                        '<td>' + normalRange(ob) + '</td>'+
                        '<td>' + checkValue(ob) + '</td>'+
                        '<td>' + ob.valueQuantity.unit + '</td>'+
                        '<td>' + formatDate(ob.effectiveDateTime, true) + '</td>' +
                        '<td>' + ob.status + '</td>';
                    }

                    html += '</tr>';
                }

                $("#labResults").find("tbody").append(html);

            }
        });
    }

    function normalRange(ob){

        var range = "";
        if(ob.referenceRange !== undefined && ob.referenceRange.length === 1)
        {
            var referenceRange = ob.referenceRange[0];
            var low = referenceRange.low;
            var high = referenceRange.high;

            range = low.value + " - " + high.value;
        }

        return range;
    }

    function checkValue(ob){

        var value = parseFloat(ob.valueQuantity.value);
        var high, low;

        if(ob.referenceRange !== undefined && ob.referenceRange.length === 1)
        {
            var referenceRange = ob.referenceRange[0];
            var low = parseFloat(referenceRange.low.value);
            var high = parseFloat(referenceRange.high.value);
        }

        var range = false, cellValue, icon;

        if(value >= low && value <= high)
        {
            range = true;
        }  
        else if (value < low)
        { 
            icon = "down";
        }
        else if (value > high)
        {
            icon = "up";
        }
    
        if (range) 
        {
            cellValue = '<span class="normal">' + value + '</span>';
        }
        else 
        {
            cellValue = '<span class="abnormal">' + value + '<i class="fa fa-chevron-circle-' + icon + '"></i></span>';
        }

        return cellValue;
    }

    // Helper functions (dates)

    function getAge(dateString) {
        var now = new Date();
        var today = new Date(now.getYear(), now.getMonth(), now.getDate());

        var yearNow = now.getYear();
        var monthNow = now.getMonth();
        var dateNow = now.getDate();

        var dob = new Date(dateString.substring(6, 10),
                dateString.substring(0, 2) - 1,
            dateString.substring(3, 5)
        );

        var yearDob = dob.getYear();
        var monthDob = dob.getMonth();
        var dateDob = dob.getDate();
        var age = {};
        var ageString = "";
        var yearString = "";
        var monthString = "";
        var dayString = "";


        var yearAge = yearNow - yearDob;

        if (monthNow >= monthDob)
            var monthAge = monthNow - monthDob;
        else {
            yearAge--;
            var monthAge = 12 + monthNow - monthDob;
        }

        if (dateNow >= dateDob)
            var dateAge = dateNow - dateDob;
        else {
            monthAge--;
            var dateAge = 31 + dateNow - dateDob;

            if (monthAge < 0) {
                monthAge = 11;
                yearAge--;
            }
        }

        age = {
            years: yearAge,
            months: monthAge,
            days: dateAge
        };

        if (age.years > 1) yearString = "y";
        else yearString = "y";
        if (age.months > 1) monthString = "m";
        else monthString = "m";
        if (age.days > 1) dayString = " days";
        else dayString = " day";


        if ((age.years > 0) && (age.months > 0) && (age.days > 0))
            ageString = age.years + yearString + " " + age.months + monthString;// + ", and " + age.days + dayString + " old";
        else if ((age.years == 0) && (age.months == 0) && (age.days > 0))
            ageString = age.days + dayString + " old";
        else if ((age.years > 0) && (age.months == 0) && (age.days == 0))
            ageString = age.years + yearString;// + " old. Happy Birthday!";
        else if ((age.years > 0) && (age.months > 0) && (age.days == 0))
            ageString = age.years + yearString + " and " + age.months + monthString;// + " old";
        else if ((age.years == 0) && (age.months > 0) && (age.days > 0))
            ageString = age.months + monthString; // + " and " + age.days + dayString + " old";
        else if ((age.years > 0) && (age.months == 0) && (age.days > 0))
            ageString = age.years + yearString;// + " and " + age.days + dayString + " old";
        else if ((age.years == 0) && (age.months > 0) && (age.days == 0))
            ageString = age.months + monthString;// + " old";
        else ageString = "Oops! Could not calculate age!";

        return ageString;
    }

    function formatDate(date, completeDate) {

        var d = new Date(date);

        var curr_date = d.getDate();
        curr_date = normalizeDate(curr_date);

        var curr_month = d.getMonth();
        curr_month++;
        curr_month = normalizeDate(curr_month);

        var curr_year = d.getFullYear();

        var curr_hour = d.getHours();
        curr_hour = normalizeDate(curr_hour);

        var curr_min = d.getMinutes();
        curr_min = normalizeDate(curr_min);

        var curr_sec = d.getSeconds();
        curr_sec = normalizeDate(curr_sec);

        var dateString, monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (completeDate){
            dateString = curr_date + "-" + monthNames[curr_month-1] + "-" + curr_year + " at " + curr_hour + ":" + curr_min; // + ":" + curr_sec;
        }
        else dateString = curr_date + "-" + monthNames[curr_month-1] + "-" + curr_year;

        return dateString;

    }

    function formatDateUS(date) {
        var d = new Date(date);

        var curr_date = d.getDate();
        curr_date = normalizeDate(curr_date);

        var curr_month = d.getMonth();
        curr_month++;
        curr_month = normalizeDate(curr_month);

        var curr_year = d.getFullYear();

        return curr_month + "-" + curr_date + "-" + curr_year;

    }

    function getAgeInYears(dateOfBirth) {
        var dob = new Date(dateOfBirth);
        var timeDiff = Math.abs(Date.now() - dob.getTime());
        return Math.floor(timeDiff / (1000 * 3600 * 24 * 365));
    }

    function normalizeDate(el) {
        el = el + "";
        if (el.length == 1) {
            el = "0" + el;
        }
        return el;
    }

    patientData().done(function() {
        $.when(
            getVitals(),
            getAllergies(),
            getMedications(),
            getProblems(),
            getLabs(),
            getBloodPressures(),
            getPulse()
        )
    });
});

