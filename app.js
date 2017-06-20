$(document).ready(function(){
    timezones = {
        VST: "UTC+07:00",
        JST: "UTC+09:00"
    };

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

    $("#submit").click(function () {
        $("#content").html("");
        setupVariables();
        if (!startDate || !endDate) {
            alert("Date Range is required");
        } else {
            showFreeTime(minDate, maxDate, tz, startTime, endTime);
        }

        function setupVariables() {
            startDate = $("#start-date").val();
            endDate = $("#end-date").val();
            startTime = $("#start-time").val();
            endTime = $("#end-time").val();
            minDateString = startDate + "T" + startTime + timezones.VST.substring(3);
            maxDateString = endDate + "T" + endTime + timezones.VST.substring(3);
            minDate = new Date(minDateString).toJSON();
            maxDate = new Date(maxDateString).toJSON();

            // Get timezone location
            tz = $("#time-standard").val();
        }
    });

    function showFreeTime(minDate, maxDate, tz, startTime, endTime) {
        var data = {
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
            .then(function(response) {
                resp = JSON.parse(response.body);
                booked_time = resp.calendars[calendarId].busy;
                dateArray = groupEventsByDate(booked_time);
                ignoreBusyTime(dateArray);
            });

        function groupEventsByDate(booked_time) {
            dateArr = [];
            for (i=0; i < booked_time.length; i++) {
                dateString = booked_time[i].start.substring(0, 10);
                date = Date.parse(dateString);
                if (!dateArr.length){
                    dateArr.push(
                        {[date]: [
                            booked_time[i]
                        ]}
                    );
                } else {
                    lastEle = dateArr.length - 1;
                    last_date = parseInt(Object.keys(dateArr[lastEle])[0]);
                    if (date == last_date) {
                        dateArr[lastEle][date].push(booked_time[i]);
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
            for (var i = 0; i < dateArray.length; i++) {
                dateString = Object.keys(dateArray[i]);
                date = new Date(parseInt(dateString));
                message = formatDate(date) + " &nbsp &nbsp";
                message += listFreeTime(dateArray[i][dateString]);
                $("#content").append('<p><strong>' + message + '</strong></p>');
            }
        }

        function listFreeTime(datetimeArr){
            timeArr = convertDateToTime(datetimeArr);
            freeTime = "";
            startFound = false;

            // Notice: if event are overlapped, they are combined in calendars.freebusy.query

            for (var i = 0; i < timeArr.length; i++) {
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
            for (var i=0; i < dateTA.length; i++){
                dateTA[i].start = dateTA[i].start.substring(11, 16);
                dateTA[i].end = dateTA[i].end.substring(11, 16);
            }
            return dateTA;
        }

        function greaterThan(time1, time2) {
            arbitraryDate = "2000-01-01";
            timeStr1 = arbitraryDate + "T" + time1;
            timeStr2 = arbitraryDate + "T" + time2;

            return (Date.parse(timeStr1) > Date.parse(timeStr2));
        }

        function addTime(time1, time2) {
            return time1 + "-" + time2 + tz + " &nbsp";
        }

    }

    function formatDate(fulldate){
        var monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        var dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        var dayIndex = fulldate.getDay();
        var date = fulldate.getDate();
        var monthIndex = fulldate.getMonth();

        return monthNames[monthIndex] + " " + ordinal_suffix_of(date) + " (" + dayNames[dayIndex]+ ") ";

        // add suffix
        function ordinal_suffix_of(i) {
            var j = i % 10,
                k = i % 100;
            if (j == 1 && k != 11) {
                return i + "st";
            }
            if (j == 2 && k != 12) {
                return i + "nd";
            }
            if (j == 3 && k != 13) {
                return i + "rd";
            }
            return i + "th";
        }
    }
});