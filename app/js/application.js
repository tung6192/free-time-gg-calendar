/*eslint no-undef: 0*/
require("flatpickr");
require("moment/locale/ja");

$(document).ready(() => {

    // Initial setup
    let timezones = {
        VST: "UTC+07:00",
        JST: "UTC+09:00"
    };

    // Input time will have Vietnam Standard Timezone UTC+07:00 as default
    let defaultTimeZone = "+07:00";

    $("#start-date, #end-date").flatpickr({});

    $("#start-time").flatpickr({
        enableTime: true,
        noCalendar: true,
        minuteIncrement: 30,
        defaultDate: "06:00",
        time_24hr: true
    });

    $("#end-time").flatpickr({
        enableTime: true,
        noCalendar: true,
        minuteIncrement: 30,
        defaultDate: "18:00",
        time_24hr: true
    });

    // Initiate clipboard
    new clipboard('.btn');

    // Load Calendar List
    loadCalendarList();

    function loadCalendarList(){
        if(typeof listOfCalendars !== "undefined"){
            $("#calendar-id").prop("disabled", false);
            for (let i = 0; i < listOfCalendars.length; i++) {
                if (listOfCalendars[i].primary){
                    $("#calendar-id").append(`<option value=${listOfCalendars[i].id} selected="selected"> ${listOfCalendars[i].summary } </option>`);
                } else {
                    $("#calendar-id").append(`<option value=${listOfCalendars[i].id}> ${listOfCalendars[i].summary } </option>`);
                }
            }
        }
        else{
            setTimeout(loadCalendarList, 250);
        }
    }

    // Get used language
    let language;
    $("input[type=radio][name=language]").on("change", function () {
        language = $(this).val();
    });

    // Handle check free time click
    $("#submit").click(() => {
        $("#content").html("");
        let startDate, endDate, startTime, endTime, minDate, maxDate, tz, calendarId;
        init();
        if (!startDate || !endDate) {
            alert("Date Range is required");
        } else {
            $(".clipboard").show();
            let dateRange = createDateRange(startDate, endDate);
            showFreeTime(minDate, maxDate, tz, startTime, endTime, calendarId, dateRange);
        }

        function init() {
            startDate = $("#start-date").val();
            endDate = $("#end-date").val();
            startTime = $("#start-time").val();
            endTime = $("#end-time").val();
            let minDateString = `${ startDate }T${ startTime }${ defaultTimeZone }`;
            let maxDateString = `${ endDate }T${ endTime }${ defaultTimeZone }`;
            minDate = moment(minDateString).utc().format();
            maxDate = moment(maxDateString).utc().format();
            calendarId = $("#calendar-id").val();

            // Get timezone location
            tz = $("#time-standard").val();
        }
    });

    function createDateRange(startDate, endDate) {
        let start = new Date(startDate);
        let end = new Date(endDate);
        let dateRange = [];
        for (let d = start; d <= end; d.setDate(d.getDate()+1)){
            dateRange.push({[d]:[]});
        }
        return dateRange;
    }

    function showFreeTime(minDate, maxDate, tz, startTime, endTime, calendarId, dateRange) {
        let data = {
            "timeMin": minDate,
            "timeMax": maxDate,
            "timeZone": timezones[tz],
            "items": [
                {
                    "id": calendarId
                }
            ]
        };

        // Return value from GG Calendar API
        gapi.client.calendar.freebusy.query(data)
            .then((response) => {
                let resp = JSON.parse(response.body);
                let booked_time = resp.calendars[calendarId].busy;
                let dateArray = groupEventsByDate(dateRange, booked_time);
                ignoreBusyTime(dateArray);
            });

        function groupEventsByDate(dateArr, booked_time) {
            for (let i=0; i < booked_time.length; i++) {
                let eventString = booked_time[i].start.substring(0, 10);
                let eventTime = new Date(eventString);
                for (let j=0; j < dateArr.length; j++){
                    let dateTime = new Date(Object.keys(dateArr[j]));
                    if (eventTime.getTime() == dateTime.getTime()) {
                        dateArr[j][dateTime].push(booked_time[i]);
                    }
                }
            }
            return dateArr;
        }

        function ignoreBusyTime(dateArray) {
            for (let i = 0; i < dateArray.length; i++) {
                let date = new Date(Object.keys(dateArray[i]));
                moment.locale(language);
                let message = `${moment(date).format("MMM Do (ddd)")  } &nbsp &nbsp`;
                message += listFreeTime(dateArray[i][date]);

                // color weekend
                if (date % 7 == 2) {
                    $("#content").append(`<p style="color: #ff0052"><strong>${ message }</strong></p>`);
                } else if (date % 7 == 3) {
                    $("#content").append(`<p style="color: #ff0052"><strong>${ message }</strong></p>`);
                    $("#content").append(`<div>---</div>`);
                } else {
                    $("#content").append(`<p><strong>${ message }</strong></p>`);
                }
            }
        }

        function listFreeTime(datetimeArr){
            let timeArr = convertDateToTime(datetimeArr);
            let freeTime = "";
            let startFound = false;

            // Check if the day doesn't have any event
            if (!datetimeArr.length){
                freeTime += addTime(startTime, endTime);
                return freeTime;
            }

            // Notice: if event are overlapped, they are combined in calendars.freebusy.query
            for (let i = 0; i < timeArr.length; i++) {
                if (!startFound) {
                    if (greaterThan(timeArr[i].start, endTime)) {
                        freeTime += addTime(startTime, endTime);
                        break;
                    } else if (greaterThan(timeArr[i].start, startTime )) {
                        startFound = true;
                        // Check if the aray has only 1 element, check endTime immediately
                        if (timeArr.length == 1){
                            freeTime += addTime(startTime, timeArr[i].start);
                            if (greaterThan(endTime, timeArr[i].end)) {
                                freeTime += addTime(timeArr[i].end, endTime);
                            }

                            // first element
                        } else if (i==0) {
                            freeTime += addTime(startTime, timeArr[i].start);

                            // not first element
                        } else {
                            // compare previous start with start time
                            if (greaterThan(timeArr[i-1].end, startTime)) {
                                freeTime += addTime(timeArr[i-1].end, timeArr[i].start);
                            } else {
                                freeTime += addTime(startTime, timeArr[i].start);
                            }
                        }
                    }
                } else {
                    // check end of previous element
                    if (greaterThan(endTime, timeArr[i-1].end)) {

                        // compare start with end time
                        if (greaterThan(timeArr[i].start, endTime)) {
                            freeTime += addTime(timeArr[i-1].end, endTime);
                            break;
                        } else {
                            freeTime += addTime(timeArr[i-1].end, timeArr[i].start);
                        }

                        // Check if the last element
                        if (i == timeArr.length -1 ) {
                            if (greaterThan(endTime, timeArr[i].end)) {
                                freeTime += addTime(timeArr[i].end, endTime);
                                break;
                            }
                        }
                    } else {
                        break;
                    }
                }
            }
            return freeTime;
        }

        function convertDateToTime(dateTA) {
            for (let i=0; i < dateTA.length; i++){
                dateTA[i].start = dateTA[i].start.substring(11, 16);
                dateTA[i].end = dateTA[i].end.substring(11, 16);
            }
            return dateTA;
        }

        function greaterThan(time1, time2) {
            let timeStr1 = moment(time1, "h:m");
            let timeStr2 = moment(time2, "h:m");

            return timeStr2.isBefore(timeStr1)
        }

        function addTime(time1, time2) {
            return `${ time1 } - ${ time2 }${ tz } &nbsp`;
        }

    }
});
