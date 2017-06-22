require("flatpickr");
let moment = require("moment");
$(document).ready(() => {
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

    loadCalendarList();

    function loadCalendarList(){
        if(typeof listOfCalendars !== "undefined"){
            $("#calendar-id").prop('disabled', false);
            for (let i = 0; i < listOfCalendars.length; i++) {
                $("#calendar-id").append(`<option val=${listOfCalendars[i].id}>${listOfCalendars[i].summary }</option>`);
            }
        }
        else{
            setTimeout(loadCalendarList, 250);
        }
    }

    $("#submit").click(() => {
        $("#content").html("");
        let startDate, endDate, startTime, endTime, minDate, maxDate, tz, calendarId;
        init();
        if (!startDate || !endDate) {
            alert("Date Range is required");
        } else {
            showFreeTime(minDate, maxDate, tz, startTime, endTime, calendarId);
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

    function showFreeTime(minDate, maxDate, tz, startTime, endTime, calendarId) {
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
        gapi.client.calendar.freebusy.query(data)
            .then((response) => {
                let resp = JSON.parse(response.body);
                let booked_time = resp.calendars[calendarId].busy;
                let dateArray = groupEventsByDate(booked_time);
                ignoreBusyTime(dateArray);
            });

        function groupEventsByDate(booked_time) {
            let dateArr = [];
            for (let i=0; i < booked_time.length; i++) {
                let dateString = booked_time[i].start.substring(0, 10);
                let date = Date.parse(dateString);
                if (!dateArr.length){
                    dateArr.push(
                        {[date]: [
                            booked_time[i]
                        ]}
                    );
                } else {
                    let lastElement = dateArr.length - 1;
                    let lastDate = parseInt(Object.keys(dateArr[lastElement])[0]);
                    if (date == lastDate) {
                        dateArr[lastElement][date].push(booked_time[i]);
                    } else {
                        dateArr.push(
                            {[date]: [
                                booked_time[i]
                            ]}
                        )
                    }
                }
            }
            return dateArr;
        }

        function ignoreBusyTime(dateArray) {
            for (let i = 0; i < dateArray.length; i++) {
                let dateString = Object.keys(dateArray[i]);
                let message = `${moment(parseInt(dateString)).format("MMM Do (ddd)")  } &nbsp &nbsp`;
                message += listFreeTime(dateArray[i][dateString]);
                $("#content").append(`<p><strong>${ message }</strong></p>`);
            }
        }

        function listFreeTime(datetimeArr){
            let timeArr = convertDateToTime(datetimeArr);
            let freeTime = "";
            let startFound = false;

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