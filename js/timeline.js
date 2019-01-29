/**
 * Created by LeandroG on 7.4.2014.
 */


(function ( $, window, document, undefined ) {

    var pluginName = "ccriTimeline",
        defaults = {
            baseUrl: "https://data.developer.nhs.uk/ccri-fhir/STU3/"
        };

    function Plugin( element, options ) {
        this.element = element;
        this.$element = $(this.element);

        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    Plugin.prototype = {

        init: function() {

            this.getDocs();

        },

        _formatDate: function(date, completeDate){

            var d = new Date(date);

            var curr_date = d.getDate();
            curr_date = this._normalizeDate(curr_date);

            var curr_month = d.getMonth();
            curr_month++;
            curr_month = this._normalizeDate(curr_month);

            var curr_year = d.getFullYear();

            var curr_hour = d.getHours();
            curr_hour = this._normalizeDate(curr_hour);

            var curr_min = d.getMinutes();
            curr_min = this._normalizeDate(curr_min);

            var curr_sec = d.getSeconds();
            curr_sec = this._normalizeDate(curr_sec);

            var dateString;
            if (completeDate) dateString = curr_date + "-" + curr_month + "-" + curr_year + " " + curr_hour + ":" + curr_min;// + ":" + curr_sec;
            else dateString = curr_date + "-" + curr_month + "-" + curr_year;

            return dateString;

        },

        _normalizeDate: function(el){

            el = el + "";

            if (el.length == 1){
                el = "0" + el;
            }

            return el;
        },


        capitaliseFirstLetter: function(string){

            return string.charAt(0).toUpperCase() + string.slice(1);

        },

        flattenResource: function(resource){

            var data = [];
            //Map each bit of the resource onto a flat data structure so that HTML is generated correctly 
            switch(resource.resourceType){
                case "Encounter":
                    var details = {};
                    details.label = "Details";
                    details.children = [];
                    details.children.push(
                        {
                            displayValue:resource.class.display,
                            label:"Class"
                        });
                    details.children.push(
                        {
                            displayValue:resource.type[0].coding[0].display,
                            label:"Type"
                        });
                    details.children.push(
                        {
                            displayValue:resource.period.start,
                            label:"Start Date"
                        });
                    details.children.push(
                        {
                            displayValue:resource.period.end,
                            label:"End Date"
                        });

                    var participants = {}
                    participants.label = "Participants";
                    participants.children = [];

                    for(var i=0;i<resource.participant.length;i++)
                    {
                        participants.children.push(
                            {
                                displayValue:resource.participant[i].individual.display + " (Role: " + this.capitaliseFirstLetter(resource.participant[i].type[0].coding[0].display)+ ")",
                                label:"Participant"
                            }
                        );
                    }

                    data.push(details);
                    data.push(participants);

                    break;
                case "Condition":
                    var details = {};
                    details.label = "Details";
                    details.children = [];
                    details.children.push(
                        {
                            displayValue:resource.code.coding[0].display,
                            label:"Condition"
                        }
                    );
                    details.children.push(
                        {
                            displayValue:resource.clinicalStatus,
                            label:"Status"
                        }
                    );

                    var snomed = {};
                    snomed.label = "SNOMED CT";
                    snomed.children = [];
                    snomed.children.push(
                        {
                            displayValue:resource.code.coding[0].code,
                            label:"SCTID"
                        }
                    );
                    snomed.children.push(
                        {
                            displayValue:resource.code.coding[0].display,
                            label:"Term"
                        }
                    );

                    data.push(details);
                    data.push(snomed);

                    break;
                case "MedicationStatement":

                    var details = {};
                    details.label = "Details";
                    details.children = [];
                    details.children.push(
                        {
                            displayValue:resource.medicationReference.display,
                            label:"Medication"
                        }
                    );
                    details.children.push(
                        {
                            displayValue:resource.status,
                            label:"Status"
                        }
                    );

                    data.push(details);

                    if(resource.dosage !== undefined && resource.dosage.length > 0)
                    {
                        var dosage = {};
                        dosage.label = "Dosage";
                        dosage.children = [];
                        dosage.children.push(
                            {
                                displayValue:resource.dosage[0].text,
                                label:"Text"
                            }
                        );
                        dosage.children.push(
                            {
                                displayValue:resource.dosage[0].patientInstruction,
                                label:"Patient Instruction"
                            }
                        );

                        dosage.children.push(
                            {
                                displayValue:resource.dosage[0].route.coding[0].display,
                                label:"Route"
                            }
                        );

                        data.push(dosage);
                    }

                    break;
                case "Observation":

                    var details = {};
                    details.label = "Details";
                    details.children = [];
                    details.children.push(
                        {
                            displayValue:resource.status,
                            label:"Status"
                        }
                    );

                    if(resource.category !== undefined && resource.category.length > 0)
                    {

                        details.children.push(
                            {
                                displayValue:resource.category[0].coding[0].display,
                                label:"Category"
                            }
                        );
                    }

                    details.children.push(
                        {
                            displayValue:resource.code.coding[0].display,
                            label:"Type"
                        }
                    );

                    details.children.push(
                        {
                            displayValue:resource.effectiveDateTime,
                            label:"Effective Date"
                        }
                    );

                    data.push(details);

                    var values = {};
                    values.label = "Values";
                    values.children = [];

                    if(resource.component != undefined && resource.component.length > 0)
                    {
                        for(var i = 0; i<resource.component.length;i++)
                        {
                            values.children.push(
                                {
                                    displayValue:resource.component[i].code.coding[0].display,
                                    label:"Observation"                                 
                                }
                            );
                            values.children.push(
                                {
                                    displayValue:resource.component[i].valueQuantity.value + " " + resource.component[i].valueQuantity.unit,
                                    label:"Value"                                 
                                }
                            );
                        }

                    } else {
                        values.children.push(
                            {
                                displayValue:resource.code.coding[0].display,
                                label:"Observation"                                 
                            }
                        );

                        if(resource.valueQuantity !== undefined) {
                            values.children.push(
                                {
                                    displayValue:resource.valueQuantity.value + " " + resource.valueQuantity.unit,
                                    label:"Value"                                
                                }
                            );

                        } else if(resource.valueCodeableConcept !== undefined) {
                            values.children.push(
                                {
                                    displayValue:resource.valueCodeableConcept.coding[0].display,
                                    label:"Value"                                
                                }
                            );
                        }
                    }

                    if(resource.interpretation !== undefined)
                    {
                        values.children.push(
                            {
                                displayValue:resource.interpretation.coding[0].display + " (" + resource.interpretation.coding[0].code + ")",
                                label:"Interpretation"                                
                            }
                        );
                    }

                    if(resource.referenceRange !== undefined && resource.referenceRange.length > 0)
                    {
                        for(var range in resource.referenceRange)
                        {
                            values.children.push(
                                {
                                    displayValue:resource.referenceRange[range].value,
                                    label:this.capitaliseFirstLetter(range)                                
                                }
                            );
                        }
                    }

                    data.push(values);

                break;
            }

            return data;
        },

        getContent: function(resource){

            var data = this.flattenResource(resource);

            this.details = '';

            this.contentHTML(data);

            return this.details;

        },

        contentHTML: function(data){

            this.details += '<ul>';
            for (var i=0; i<data.length; i++){

                if(data[i].displayValue){

                    var value = data[i].displayValue;
                    if(data[i].label.toLowerCase().indexOf( "time") != -1 || data[i].label.toLowerCase().indexOf( "date") != -1){
                        value = this._formatDate(value, true);
                    }

                    this.details += '<li>' + this.capitaliseFirstLetter(data[i].label) + ": " + this.capitaliseFirstLetter(value) + '</li>';

                }
                else{

                    if(data[i].children){

                        this.details += '<li>' + this.capitaliseFirstLetter(data[i].label) + '</li>';

                        this.contentHTML(data[i].children);

                        this.details += '</ul>';

                    }

                }
            }
        },

        //Exercise 2 - Fetch a total of 50 resources comprising: Encounter, Observation, MedicationStatement and Condition for patient id 1181
        getDocs: function(){

            var self = this;

            return $.ajax({
                type: "GET",
                url: this.options.baseUrl + "Patient?_id=1181&_revinclude=Encounter:patient&_revinclude=Observation:patient&_revinclude=MedicationStatement:patient&_revinclude=Condition:patient&_count=50",
                contentType: 'application/json+fhir',
                success: function (bundle) {
                    self.renderDocs(bundle);
                }
            });
        },

        renderDocs: function(bundle){

            this.$element.html('<ul class="timeline"></ul>');

            var timelineItem = Handlebars.compile( $("#timeline-entry").html() );

            var entries = bundle.entry;

            //De-dupe

            //Sort the array in date descending (most recent first)
            //CCRI doesn't seem to support _sort=-lastUpdated (of course may not yield correct results but for example is fine)
            entries.sort(function (a,b) {
                return new Date(b.resource.meta.lastUpdated) - new Date(a.resource.meta.lastUpdated);
            });

            for(var i=0; i<entries.length; i++){

                var resource = entries[i].resource;
                var resourceType = resource.resourceType;
                var header = "";

                if(resourceType !== "Patient")
                {
                    var icon, time = resource.meta.lastUpdated;

                    this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    var date = new Date(time);

                    var dateAbbr = date.getDate() + '-' + this.monthNames[date.getMonth()];

                    switch(resourceType){
                        case "Encounter":
                            icon = "fa-ambulance";
                            header = this.capitaliseFirstLetter(resource.class.display);
                            break;
                        case "Condition":
                            icon = "fa-stethoscope";
                            header = resource.code.coding[0].display;
                            break;
                        case "MedicationStatement":
                            icon = "fa-medkit";
                            header = resource.medicationReference.display;
                            break;
                        case "Observation":
                            icon = "fa-plus-square";
                            header = resource.code.coding[0].display;
                            break;
                    }

                    var content = this.getContent(resource);

                    var context = {
                        datetime: time,
                        date_complete: this._formatDate(date, true),
                        date_principal: dateAbbr,
                        icon: icon,
                        title: resourceType,
                        composer: header,
                        content: content
                    };

                    var html = timelineItem(context);
                    $('.timeline').append(html);

                    this.setContentStyle($('.timeline').find('.timeline-item:last-child').find('.timeline-content'));
                }
            }

            this.setDetailEvents();

            $('.timeline-content').hide();

            var self = this;

            $('.timeline > li .timeline-label .timeline-title').bind({
                click: function() {

                    var el = $(this);

                    el.toggleClass('collapsed expanded');

                    var content = el.siblings('.timeline-content');

                    content.slideToggle('2000', 'easeInOutCubic');
                }
            });

            $('.timeline > li .timeline-label .display-item').bind({
                click: function() {
                    var li = $(this).closest('li');
                    li.fadeOut(300, function(){
                        li.remove();
                    });

                }
            });

        },

        setContentStyle: function(el){
            el.find('ul:first').addClass("form-element");

            var self = this;
            el.find("li").each(function() {

                if($(this).next().length > 0){
                    if( $(this).next().get(0).tagName == 'UL' ){
                        self.setStyle(this, true);
                    }
                    else{
                        self.setStyle(this, false);
                    }
                }
                else self.setStyle(this, false);

            });

        },

        setStyle: function(el, isTitle){

            if(isTitle){

                $(el).prepend('<i class="fa fa-angle-down"></i>');
                $(el).addClass('form-header opened');

            }
            else{

                $(el).addClass('form-content');
                var text = $(el).text();
                var index = text.indexOf(': ');
                var title = text.substring(0, index+2);
                var value = text.slice(index+2, text.length);

                $(el).html('<span>'+title+'</span>'+value);
                //else $(el).html('<div class="longtext-title">'+title+'</div><br><div>'+value+'</div>');
            }

        },

        setDetailEvents: function(){

            $('.form-header').bind({
                click: function() {

                    if( $(this).find('i').hasClass('fa-rotate-45') )  $(this).find('i').removeClass('fa-rotate-45');

                    $(this).next().slideToggle('2000', 'easeInOutCubic');

                    $(this).toggleClass("opened closed");

                    $(this).find('i').toggleClass("fa-angle-right fa-angle-down");

                },
                mouseenter: function() {

                    if( $(this).hasClass('closed') ){
                        $(this).find('i').addClass('fa-rotate-45');
                        $(this).find('i').css('color', '#3498DB');
                    }

                },
                mouseleave: function() {

                    if( $(this).hasClass('closed') ){
                        $(this).find('i').removeClass('fa-rotate-45');
                        $(this).find('i').css('color', '#c9cdd7');
                    }
                }
            });

        }
    };

    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                    new Plugin( this, options ));
            }
        });
    };

})( jQuery, window, document );
