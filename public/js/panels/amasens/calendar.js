//Setup calendar in Publication Section
$(document).ready(function () {
    var daySel;
    const now = new Date()
    sCalendar = $("#calendarContainer").simpleCalendar({
        //Defaults options below
        //string of months starting from january
        months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
        days: ['Domenica', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato'],
        displayYear: true,              // Display year in header
        fixedStartDay: true,            // Week begin always by monday or by day set by number 0 = sunday, 7 = saturday, false = month always begin by first day of the month
        displayEvent: false,             // Display existing event
        disableEventDetails: true, // disable showing event details
        disableEmptyDetails: false, // disable showing empty date details
        events: [],                     // List of events
        onInit: function (calendar) {
            if (QUERY_DAY) {
                $(".today").removeClass("today");
                $(daySel).addClass("today");
            }
        }, // Callback after first initialization
        onMonthChange: function (month, year) {
            $(".today").removeClass("today");
            var r = /[0-9]*$/;
            var rM = /-([0-9]*)-/;
            var rY = /^([0-9]*)-/;
            if (QUERY_DAY) {
                var today = r.exec($("#txtDate").val());
                var curM = rM.exec($("#txtDate").val())[1];
                var curY = rY.exec($("#txtDate").val())[1];
                $(".day").each((i, x) => {
                    if (!$(x).hasClass("wrong-month")) {
                        if (parseInt(x.innerText) === parseInt(today) && month === parseInt(curM) - 1 && year === parseInt(curY)) $(x).addClass("today");
                    }
                });
            }
        }, // Callback on month change

        onDateSelect: function (date, events, t) {
            const currentDaySel = date.toLocaleDateString("zh-hans-cn", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).replace(/\//g, "-");
            console.log(currentDaySel, "currentDaySel")
            currentDay=currentDaySel;
            loadDay(currentDaySel);
            $("#txtDate").val(currentDaySel);
            $("#txtDate")[0].dispatchEvent(new Event("change"));
            $(".today").removeClass("today");
            $(".day").each((i, x) => {
                if (!$(x).hasClass("wrong-month")) {
                    if (parseInt(x.innerText) === date.getDate()) $(x).addClass("today");
                }
            });
        }, // Callback on date selection

        onEventSelect: function () { }, // Callback on event selection - use $(this).data('event') to access the event
        onEventCreate: function ($el) { },          // Callback fired when an HTML event is created - see $(this).data('event')
        onDayCreate: function ($el, d, m, y) {
            var r = /[0-9]*$/;
            var rM = /-([0-9]*)-/;
            if (QUERY_DAY) {
                var today = r.exec(QUERY_DAY);
                var curM = rM.exec(QUERY_DAY)[1];
                if (!$($el).hasClass("wrong-month")) {
                    if (d === parseInt(today) && m === parseInt(curM) - 1) daySel = $el;
                }
            }
        }  // Callback fired when an HTML day is created   - see $(this).data('today'), .data('todayEvents')
    });
});
