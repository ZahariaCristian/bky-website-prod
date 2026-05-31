const URL_PARAMS = new URLSearchParams(window.location.search);
const QUERY_DAY = URL_PARAMS.get("day");
const QUERY_NEW = URL_PARAMS.get("edit");
const EDIT = URL_PARAMS.get("enableEdit");
var blacklist = [];
var tmpID = 0;
var sCalendar = null;


// Global variable to store reports
var reports = [];

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        // Get annuncio ID from hidden input
        const annuncioId = document.getElementById('annuncioID').value;
        console.log("Annuncio ID got for whatsappsender:", annuncioId);

        // Elements
        const btnToggleNotify = document.getElementById('btnToggleNotify');
        const expiresAtInput = document.getElementById('expiresAtInput');
        const btnSaveExpiresAt = document.getElementById('btnSaveExpiresAt');

        // --- Show loading on save button ---
        btnSaveExpiresAt.disabled = true;
        const originalSaveText = btnSaveExpiresAt.textContent;
        btnSaveExpiresAt.textContent = "Caricamento...";

        // --- 1. Load current notifyEnabled and expiresAt ---
        fetch(`/annuncio/getOne`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ annuncioId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.annuncio) {
                // Set notifyEnabled button
                setNotifyBtn(data.annuncio.notifyEnabled);

                // Set expiresAt input (convert UTC → Italian local time)
                if (data.annuncio.expiresAt) {
                    const utcDate = new Date(Number(data.annuncio.expiresAt));
                    if (!isNaN(utcDate.getTime())) {
                        // Format: "YYYY-MM-DDTHH:mm" (Italian local time)
                        expiresAtInput.value = formatDateToLocalDatetime(utcDate);
                    }
                }

                // Set notified status
                const notifiedStatus = document.getElementById('notifiedStatus');
                if (notifiedStatus) {
                    if (data.annuncio.notified === true || data.annuncio.notified === 1) {
                        notifiedStatus.textContent = "Messaggio inviato";
                        notifiedStatus.className = "text-success";
                    } else {
                        notifiedStatus.textContent = "Messaggio non inviato";
                        notifiedStatus.className = "text-warning";
                    }
                }
            }
        })
        .finally(() => {
            btnSaveExpiresAt.disabled = false;
            btnSaveExpiresAt.textContent = originalSaveText;
        });

        // --- Helper: Format UTC Date to Italian Local Time (for input) ---
        function formatDateToLocalDatetime(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        // --- 2. Toggle notifyEnabled ---
        function setNotifyBtn(enabled) {
            btnToggleNotify.textContent = enabled ? "Notifiche: Attive" : "Notifiche: Disattive";
            btnToggleNotify.classList.toggle('btn-success', enabled);
            btnToggleNotify.classList.toggle('btn-secondary', !enabled);
        }

        btnToggleNotify.addEventListener('click', function() {
            fetch('/annuncio/togglenotifyenabled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ annuncioId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setNotifyBtn(data.notifyEnabled);
                } else {
                    alert('Errore nel cambiare lo stato di notifica.');
                }
            })
            .catch(() => alert('Errore di rete.'));
        });

        // --- 3. Save expiresAt (Italian time → UTC timestamp) ---
        btnSaveExpiresAt.addEventListener('click', function() {
            const val = expiresAtInput.value;
            if (!val) return alert('Seleziona data e ora');

            // Parse as Italian local time (YYYY-MM-DDTHH:mm)
            const [datePart, timePart] = val.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes] = timePart.split(':').map(Number);

            // Create Date in Italian time (month is 0-indexed)
            const italianDate = new Date(year, month - 1, day, hours, minutes);

            // Convert to Unix timestamp (UTC)
            const unixTimestamp = italianDate.getTime();

            // Send to server
            fetch('/annuncio/setExpiresAt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ annuncioId, expiresAt: unixTimestamp.toString() })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) alert('Scadenza aggiornata!');
                else alert('Errore nel salvataggio.');
            })
            .catch(() => alert('Errore di rete.'));
        });
    }, 3000); // Wait 3 seconds after DOMContentLoaded
});

// Load reports for the current phone number
function loadReports() {
    console.log("Loading reports for the current phone number...");
    const phone = document.querySelector("input[name='phone']").value;
    console.log("Current phone number:", phone);
    if (!phone) return;

    toggleLoader();
    fetch("/annuncio/getReports", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ phone })
    }).then((r) => {
        toggleLoader();
        if (r.status == 401) {
            window.location.href = "/";
        } else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento delle segnalazioni.");
        }
        r.json().then(res => {
            reports = res.reports || [];
            console.log("Loaded reports:", reports);
            renderReports();
        });
    });
}

const toggleBtn = document.getElementById('toggleReportsBtn');
const reportsDiv = document.getElementById('rptReports');
const reportCountSpan = document.getElementById('reportCount');

// Initially hide reports
reportsDiv.style.display = 'none';

// Toggle reports container visibility when clicking the button
toggleBtn.addEventListener('click', () => {
  if (reportsDiv.style.display === 'none' || reportsDiv.style.display === '') {
    reportsDiv.style.display = 'block';
  } else {
    reportsDiv.style.display = 'none';
  }
});

function renderReports() {
    console.log("Rendering reports...");
    const container = $("#rptReports");
    const tableBody = container.find("table tbody");
    const statusDiv = $("#reportStatus");

    // Clear previous rows and status
    tableBody.find(".rptItemReport").remove();
    statusDiv.empty();

    if (reports.length === 0) {
        tableBody.find(".rptNoData").show();
        reportCountSpan.textContent = '0';
        toggleBtn.classList.remove('btn-danger');
        toggleBtn.classList.add('btn-secondary');
        return;
    }

    const openCount = reports.filter(r => !r.solved).length;

    if (openCount > 0) {
        statusDiv.html(`
            <div class="alert alert-danger mb-0">
                ⚠️ Problemi con questa cliente: ha piu' di ${openCount} segnalazioni aperte
            </div>
        `);
    } else {
        statusDiv.html(`
            <div class="alert alert-success mb-0">
                ✅ Paga regolarmente, nessun problema segnalato
            </div>
        `);
    }

    tableBody.find(".rptNoData").hide();

    const template = document.getElementById("reportRowTemplate");

    reports.forEach(report => {
        const clone = template.content.cloneNode(true);
        //console.log("Processing report:", report);
        // Set date, user
        $(clone).find(".report-date").text(new Date(report.date).toLocaleString());
        $(clone).find(".report-user").text(report.user);

        $(clone).find(".report-oldphone").text(report.oldphone);

        const $reportlevel = $(clone).find(".report-level").empty();

          // Construct description with danger badge
        const $desc = $(clone).find(".report-description").empty();

        console.log("Report details:", report.dangerlevel);

        if (report.dangerlevel > 0) {
            const badgeText = {
                1: "Problemi",
                2: "Non paga",
                3: "Truffa"
            };
            const badgeColor = {
                1: "warning",
                2: "danger",
                3: "danger"
            };
            const badge = $(`<span class="badge bg-${badgeColor[report.dangerlevel]} me-2">${badgeText[report.dangerlevel]}</span>`);
            $reportlevel.append(badge);
        }

        $desc.append(document.createTextNode(report.description));
        // Show phone and old phone if available
        const phoneField = $(clone).find(".report-phone");
        let phoneText = report.phone || '';
        if (report.oldPhone) {
            phoneText += ` <small class="text-muted">(${report.oldPhone})</small>`;
        }
        phoneField.html(phoneText);

        // Status and solve button
        if (report.solved) {
            $(clone).find(".report-status")
                .text("Risolto")
                .removeClass()
                .addClass("report-status badge bg-success");
            $(clone).find(".solve-report-btn")
                .prop("disabled", true)
                .addClass("btn-secondary")
                .find("i").addClass("fa-check");
        } else {
            $(clone).find(".report-status")
                .text("Aperto")
                .removeClass()
                .addClass("report-status badge bg-warning");
            $(clone).find(".solve-report-btn")
                .addClass("btn-success")
                .find("i").addClass("fa-check")
                .end().click(() => solveReport(this, report.id));
        }

        $(clone).find("tr").attr("data-id", report.id);
        tableBody.append(clone);
    });

    reportCountSpan.textContent = reports.length;

    if (openCount > 0) {
        toggleBtn.classList.remove('btn-secondary');
        toggleBtn.classList.add('btn-danger', 'text-white', 'blinking-btn');
    } else {
        toggleBtn.classList.remove('btn-danger', 'text-white', 'blinking-btn');
        toggleBtn.classList.add('btn-secondary');
    }
}

async function getCurrentUser() {
  try {
    const res = await fetch('/annuncio/currentUser', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.status === 200) {
      const data = await res.json();
      return data.username || data.userId;  // adjust to your session property
    }
    return null;
  } catch {
    return null;
  }
}

async function addReport() {
    const description = $("#reportDescription").val().trim();
    const phone = $("#reportPhone").val().trim();

    if (!phone) {
        alert("Inserisci il numero di telefono.");
        return;
    }
    if (!description) {
        alert("Inserisci una descrizione.");
        return;
    }

    toggleLoader();

    fetch("/annuncio/addReport", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
            phone,
            description,
            date: new Date(),
            dangerlevel
        })
    }).then((r) => {
        toggleLoader();
        if (r.status === 401) {
            window.location.href = "/";
        } else if (r.status !== 200) {
            return alert("❌ Errore durante il salvataggio della segnalazione.");
        }

        $("#reportModal").modal("hide");
        $("#reportPhone").val("");
        $("#reportDescription").val("");
        loadReports();
    });
}

async function addReport() {
  const description = $("#reportDescription").val().trim();
  if (!description) {
      alert("Inserisci una descrizione per la segnalazione");
      return;
  }

  const phone = document.querySelector("input[name='phone']").value;
  if (!phone) {
      alert("Nessun numero di telefono associato all'annuncio");
      return;
  }

    const dangerlevel = document.querySelector("input[name='dangerLevel']:checked")?.value;

    if (dangerlevel === undefined) {
        alert("Seleziona un livello di pericolosità.");
        return;
    }

  toggleLoader();

  fetch("/annuncio/addReport", {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
          "Content-Type": "application/json",
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ 
          phone,
          description,
          date: new Date(),
          dangerlevel: parseInt(dangerlevel)
      })
  }).then((r) => {
      toggleLoader();
      if (r.status == 401) {
          window.location.href = "/";
      } else if (r.status !== 200) {
          return alert("❌ Si è verificato un errore durante il salvataggio della segnalazione.");
      }
      $("#reportModal").modal("hide");
      $("#reportDescription").val("");
      loadReports();
  });
}

// Mark report as solved
function solveReport(btn, reportId) {
    if (!confirm("Segnare questa segnalazione come risolta?")) return;

    toggleLoader();
    fetch("/annuncio/solveReport", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: reportId })
    }).then((r) => {
        toggleLoader();
        if (r.status == 401) {
            window.location.href = "/";
        } else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante l'aggiornamento della segnalazione.");
        }
        loadReports();
    });
}

function initReports() {
    console.log("Loading reports...");
    loadReports();

    $("#btnAddReport").click(() => {
        $("#reportModal").modal("show");
    });

    $("#btnSaveReport").click(addReport);

    $("#rptReports").on("click", ".solve-report-btn", function () {
        const reportId = $(this).closest("tr").attr("data-id");
        if (reportId) {
            //solveReport(this, reportId);
        }
    });
}

window.addEventListener("load", () => {
    console.log("Page fully loaded. Initializing reports after 1s delay...");
    setTimeout(() => {
        initReports();
    }, 1000);
});

$("html").on("dragover", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(".dragHere").show(()=>{
        setTimeout(() => {
            $(".dragHere").hide();
        }, 3000);
    });
 });

 $("html").on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });

 $('.dragHere').on('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();

    $(".dragHere > h1").text("Caricamento..");

    const phone = document.querySelector("input[name='phone']").value;
    //var files = e.originalEvent.dataTransfer.files;

    loadImage(e.originalEvent.dataTransfer);
});

if (QUERY_DAY)
    setTimeout(() => {
        document.querySelector("#txtDate").value = QUERY_DAY;
        loadDay(QUERY_DAY);
    }, 100);

const sleep = (seconds) => {
    const waitUntil = new Date().getTime() + seconds * 1000
    while(new Date().getTime() < waitUntil) {};
}
$(document).ready(function(){
    
    var daySel;
    sCalendar = $("#calendarContainer").simpleCalendar({
        //Defaults options below
        //string of months starting from january
        months: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
        days: ['Domenica','Lunedi','Martedi','Mercoledi','Giovedi','Venerdi','Sabato'],
        displayYear: true,              // Display year in header
        fixedStartDay: true,            // Week begin always by monday or by day set by number 0 = sunday, 7 = saturday, false = month always begin by first day of the month
        displayEvent: false,             // Display existing event
        disableEventDetails: true, // disable showing event details
        disableEmptyDetails: false, // disable showing empty date details
        events: [],                     // List of events
        onInit: function (calendar) {
            if (QUERY_DAY){
                $(".today").removeClass("today");
                $(daySel).addClass("today");
            }
        }, // Callback after first initialization
        onMonthChange: function (month, year) {
            $(".today").removeClass("today");
            var r = /[0-9]*$/;
            var rM = /-([0-9]*)-/;
            var rY = /^([0-9]*)-/;
            if (QUERY_DAY){
                var today = r.exec($("#txtDate").val());
                var curM = rM.exec($("#txtDate").val())[1];
                var curY = rY.exec($("#txtDate").val())[1];
                $(".day").each((i, x)=>{
                    if (!$(x).hasClass("wrong-month")){
                        if (parseInt(x.innerText) === parseInt(today) && month === parseInt(curM) - 1 && year === parseInt(curY)) $(x).addClass("today");
                    }
                });
            }
        }, // Callback on month change
        onDateSelect: function (date, events, t) {
            const currentDaySel =  date.toLocaleDateString("zh-hans-cn", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).replace(/\//g, "-");
            $("#txtDate").val(currentDaySel);
            $("#txtDate")[0].dispatchEvent(new Event("change"));
            $(".today").removeClass("today");
            $(".day").each((i, x)=>{
                if (!$(x).hasClass("wrong-month")){
                    if (parseInt(x.innerText) === date.getDate()) $(x).addClass("today");
                }
            });
        }, // Callback on date selection
        onEventSelect: function() {}, // Callback on event selection - use $(this).data('event') to access the event
        onEventCreate: function( $el ) {},          // Callback fired when an HTML event is created - see $(this).data('event')
        onDayCreate:   function( $el, d, m, y ) {
            var r = /[0-9]*$/;
            var rM = /-([0-9]*)-/;
            if (QUERY_DAY){
                var today = r.exec(QUERY_DAY);
                var curM = rM.exec(QUERY_DAY)[1];
                if (!$($el).hasClass("wrong-month")){
                    if (d === parseInt(today) && m === parseInt(curM) - 1) daySel = $el;
                }
            }
        }  // Callback fired when an HTML day is created   - see $(this).data('today'), .data('todayEvents')
    });
});

setTimeout(() => {
    toggleLoader();
    fetch("/annuncio/getDonne", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    }).then((r) => {
        toggleLoader();
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento delle donne.");
        }
        r.json().then(async (res) => {
            res.donne.forEach(donna => addDonneCmbDonne(donna));
        });
    });
    fetch("/annuncio/blacklist", {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento della blacklist.");
        }
        r.json().then(async (res) => {
            res.forEach(text => {
                blacklist.push(text);
            });
        });
    });
}, 100);

var addDonneCmbDonne = (donna)=>{
    if(donna.tblAnnuncis[0]){
        var root = $("#select2_3");
        var row = $(root).find("option").first();
        var newRow = row.clone().removeAttr("selected");
        newRow[0].value = donna.tblAnnuncis[0].id;
        newRow[0].text = `${donna.name} (${donna.phone})`;
        newRow.appendTo(root);
    }
};

$(()=>{
    if(QUERY_NEW == "new"){
        $(".widget-annuncio .form-control, .widget-annuncio .form-check-input").prop('disabled', false);
    }else{
        if(QUERY_NEW){
            let anID = parseInt(QUERY_NEW);
            annuncioID.value = anID;
            loadAnnuncio(anID);
            loadStorico(anID);
            setInterval((id) => {
                loadStorico(id);
            }, 60000, anID);
        }
    }
});

var loadStorico = (annuncio)=>{
    requestStorico(annuncio, false);
};

function requestStorico(annuncio, suspended){
    fetch("/annuncio/storico", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: annuncio, sus: suspended })
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento dello storico.");
        }
        var i = 0;
        r.json().then(async (res) => {
            if (!suspended){
                clearStorico();
            res.storico.forEach(schedule => {
                addRptStorico(schedule, i)
                i++;
            });
            $(".btnCondividi").on("mouseover", () => {
                var text = "";
                var id = $(event.currentTarget).data("id");
                $(event.currentTarget).attr("href", text);
            
                $(`.rptItemStorico[data-id='${id}']`).each((i, x)=>{
                    text = text + $(x).find("div.col-md-6.col-sm-6").text().trim() + "\n";
                });
            
                $(event.currentTarget).attr("href", "whatsapp://send?text=" + encodeURIComponent(text) + "%0a");
            });
            }else{
                res.storico.forEach(schedule => {
                    addRptStoricoSus(schedule);
                });
            }
            
        });
    });
}

var clearStorico = ()=>{
    $(".oldStorico").remove();
}

var addRptStorico = (sxhedule, i) =>{
    $(".rptNoData").hide();
    var root = $("#rptStorico");
    var row = $(root).find(".rptItemStorico").first();
    var newRow = row.clone().removeAttr("style");
    newRow.addClass("oldStorico");

    newRow.attr("data-id", sxhedule.id);
    newRow.data("id", sxhedule.id);
    
    var premium = "";
if (sxhedule.hasPremium){
    premium = " + SUPERTOP"
}
if (sxhedule.hasHighlight){
    premium = " + HIGHLIGHT"
}
if (sxhedule.hasEtichetta){
    premium = " + ETICHETTATOP"
}
if (sxhedule.hasVideo){
    premium = " + VIDEO"
}

    var text = `[TOP ${sxhedule.typeAnnuncio}${premium}] del ${sxhedule.data.split("T")[0]} alle ${sxhedule.data.split("T")[1].split(":00.")[0]}`;
    newRow.html(newRow.html().replace(/@id@/g, sxhedule.id));
    newRow.html(newRow.html().replace(/@descrizione@/g, text));
    newRow.html(newRow.html().replace(/@città@/g, (sxhedule.city || "Non presente")));
    //<p class="fa fa-clock"> @orari@</p>
    var out = "";
    if(sxhedule.dateTimeTop){
        var oPub = sxhedule.dateTimeTop.split(" - ");
        for (oP of oPub){
            out = out + `${oP.replace(/ ,/g, ", ").replace(/,/g, ", ")} `;
        }
        newRow.html(newRow.html().replace(/@orari@/g, out));
    }else{
        newRow.find(".dateTimeTop").remove();
    }
    
    newRow.find(".btnSuspend").hide();
    switch(sxhedule.state){
        case "BLOCKED":
            newRow.html(newRow.html().replace(/@stato@/g, `<a class="btn btn-xs btn-danger" style="font-size: 12px;">NUMERO BLOCCATO</a>`));
            break;
        case "OK":
            if (sxhedule.urlBK){
                newRow.html(newRow.html().replace(/@stato@/g, `<a class="btn btn-xs btn-success" style="font-size: 12px;" href="${sxhedule.urlBK}" target="_blank">BK</a>`));
                newRow.find(".btnSuspend").show();
            }else{
                newRow.html(newRow.html().replace(/@stato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
            }
            break;
        case "KO":
            newRow.html(newRow.html().replace(/@stato@/g, "<h3 class='fa fa-times text-danger'><i></i></h3>"));
            break;
        case "ALERT":
            newRow.html(newRow.html().replace(/@stato@/g, "<h3 class='fa fa-hourglass text-warning' style='padding-left: 2px;'><i></i></h3>"));
            break;
        default:
            newRow.html(newRow.html().replace(/@stato@/g, "<h3 class='fa fa-clock-o text-default'><i></i></h3>"));
    }
    switch(sxhedule.payed){
        case true:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
            break;
        default:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-times text-danger'><i></i></h3>"));
    }

    newRow.appendTo(root);

    //if (i < 20) 
    $("#btnWhatapp").attr("href", $("#btnWhatapp").attr("href") + encodeURIComponent(text) + "%0a" + out + "%0a");
};

function deleteStorico(me, idString){
    toggleLoader();
    let id = parseInt(idString);
    var anID = $("#annuncioID").val();
    if(id){
        fetch("/annuncio/deleteStorico", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({ id: id, annuncio: anID })
        }).then((r) => {
            toggleLoader();
            if (r.status == 401){
                window.location.href = "/";
            }else if(r.status !== 200) {
                return alert("❌ Si è verificato un errore durante l'eliminazione dello storico.");
            }
            $(me).parents(".rptItemStorico").hide();
            setTimeout(() => {
                location.reload();
            }, 300);
        });
    }
}

document.querySelector("#txtDate").value = new Date().toLocaleDateString("zh-hans-cn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).replace(/\//g, "-");

var tmpToday = new Date();
tmpToday.setDate(tmpToday.getDate() + 1);
document.querySelector("#txtDateClona").value = new Date(tmpToday).toLocaleDateString("zh-hans-cn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).replace(/\//g, "-");
document.querySelector("#txtDateClonaFrom").value = new Date(tmpToday).toLocaleDateString("zh-hans-cn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).replace(/\//g, "-");
tmpToday.setDate(tmpToday.getDate() + 1);
document.querySelector("#txtDateClonaTo").value = new Date(tmpToday).toLocaleDateString("zh-hans-cn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).replace(/\//g, "-");

let currentDay = document.querySelector("#txtDate").value;

const croppers = {};

let images = [];

let pubs = {};

$("#select2_3").on("change", (x)=>{
    window.location = "/annuncio.html?edit=" + x.target.value;
});
    // document.querySelector(`#cmbDonna`).addEventListener("select", (e) => {
    //     //document.querySelector(`#caricaphone-button`).click();
    //     $("#cmbDonna").val();
    // });

var loadAnnuncio = (id)=>{
    if(id){
        fetch("/annuncio/getByID", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({ id })
        }).then((r) => {
            if (r.status !== 200){
                alert("⚠ Si è verificato un errore durante il caricamento dati");
                window.location.href = "/listaAnnunci.html";
                }
            r.json().then(async (res) => {
                loadAdvertisement(res);
            });
            //document.querySelector(".carica-section").remove();
            document.querySelector("#content h1").innerHTML = "<i>Gestisci l'annuncio</i>";
        });
    }
};

document.querySelector("#caricalink-button").addEventListener("click", () => {
    const url = document.querySelector("#link-to-scrape").value;
    if (!url) return  ShowAlert("custom", "🔗 Assicurati di inserire prima un link.");//alert("🔗 Assicurati di inserire prima un link.");
    fetch("/annuncio/getByUrl", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ url }),
    }).then((r) => {
        if (r.status == 500) return alert(
            "⚠ L'annuncio richiesto non contiene il numero di telefono.",
        );
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento dati da URL",
        );
        r.json().then((res)=>{
            if (res.donna == null){
                return window.location = "/annuncio.html?edit=" + res.id + "&enableEdit=true";
            }
            window.location = "/annuncio.html?edit=" + res.id;
        });
    });
});

document.querySelector("#caricaphone-button").addEventListener("click", () => {
    const phone = document.querySelector("#phone-to-scrape").value;
    if (!phone) return ShowAlert("custom", "📞 Assicurati di inserire prima il numero di telefono.");//alert("📞 Assicurati di inserire prima il numero di telefono.");
    fetch("/annuncio/getByPhone", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ phone , key: localStorage.getItem("key") }),
    }).then((r) => {
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento dati da URL",
        );
        r.json().then(async (res) => {
            await loadAdvertisement(res);
            document.querySelector(".carica-section").remove();
            document.querySelector("#updateInfoBtn").setAttribute("disabled", true);
            document.querySelector("#updatePicsBtn").setAttribute("disabled", true);
            document.querySelector("#updateScheduleBtn").setAttribute("disabled", true);
            document.querySelector("div.container h1").innerHTML = "<i>Gestisci l'annuncio</i>";
        });
    });
});


var picIds =[];

async function loadAdvertisement (res) {
    ["title", "nickname", "age", "description", "phone", "location", "location", "name", "donnaID", "note"].forEach((info) => {
        document.querySelector(`${(info == "description" || info == "nickname" || info == "title" || info == "note") ? "textarea" : "input"}[name='${info}']`).value = (res[info] === null || res[info] === undefined) ? "" : res[info];
    });
    //SERVIZI
    if(res.serviceAfricana)
        document.querySelector("input[name='serviceAfricana']").setAttribute("checked", true);
    if(res.serviceIndiana)
        document.querySelector("input[name='serviceIndiana']").setAttribute("checked", true);
    if(res.serviceAsiatica)
        document.querySelector("input[name='serviceAsiatica']").setAttribute("checked", true);
    if(res.serviceAraba)
        document.querySelector("input[name='serviceAraba']").setAttribute("checked", true);
    if(res.serviceLatina)
        document.querySelector("input[name='serviceLatina']").setAttribute("checked", true);
    if(res.serviceCaucasica)
        document.querySelector("input[name='serviceCaucasica']").setAttribute("checked", true);
    if(res.serviceItaliana)
        document.querySelector("input[name='serviceItaliana']").setAttribute("checked", true);
    if(res.serviceSNaturale)
        document.querySelector("input[name='serviceSNaturale']").setAttribute("checked", true);
    if(res.serviceSRifatto)
        document.querySelector("input[name='serviceSRifatto']").setAttribute("checked", true);
    if(res.serviceCBiondi)
        document.querySelector("input[name='serviceCBiondi']").setAttribute("checked", true);
    if(res.serviceCMarroni)
        document.querySelector("input[name='serviceCMarroni']").setAttribute("checked", true);
    if(res.serviceCNeri)
        document.querySelector("input[name='serviceCNeri']").setAttribute("checked", true);
    if(res.serviceCRossi)
        document.querySelector("input[name='serviceCRossi']").setAttribute("checked", true);
    if(res.serviceMagro)
        document.querySelector("input[name='serviceMagro']").setAttribute("checked", true);
    if(res.serviceFormoso)
        document.querySelector("input[name='serviceFormoso']").setAttribute("checked", true);

    if(res.serviceCash)
        document.querySelector("input[name='serviceCash']").setAttribute("checked", true);
    if(res.serviceCreditCard)
        document.querySelector("input[name='serviceCreditCard']").setAttribute("checked", true);
    if(res.hourlyPrice)
        document.querySelector("select[name='hourlyPrice']").value = res.hourlyPrice;

    if(res.serviceNazionalita)
        document.querySelector("select[name='serviceNazionalita']").value = res.serviceNazionalita;
    if(res.serviceOrale)
        document.querySelector("input[name='serviceOrale']").setAttribute("checked", true);
    if(res.serviceAnale)
        document.querySelector("input[name='serviceAnale']").setAttribute("checked", true);
    if(res.serviceSadomaso)
        document.querySelector("input[name='serviceSadomaso']").setAttribute("checked", true);
    if(res.serviceEsperienzaFidanzata)
        document.querySelector("input[name='serviceEsperienzaFidanzata']").setAttribute("checked", true);
    if(res.serviceAttriciPorno)
        document.querySelector("input[name='serviceAttriciPorno']").setAttribute("checked", true);
    if(res.serviceEiaculazioneSulCorpo)
        document.querySelector("input[name='serviceEiaculazioneSulCorpo']").setAttribute("checked", true);
    if(res.serviceMassaggioErotico)
        document.querySelector("input[name='serviceMassaggioErotico']").setAttribute("checked", true);
    if(res.serviceMassaggioTantrico)
        document.querySelector("input[name='serviceMassaggioTantrico']").setAttribute("checked", true);
    if(res.serviceFetish)
        document.querySelector("input[name='serviceFetish']").setAttribute("checked", true);
    if(res.serviceBacioAllaFrancese)
        document.querySelector("input[name='serviceBacioAllaFrancese']").setAttribute("checked", true);
    if(res.serviceGiocoDiRuolo)
        document.querySelector("input[name='serviceGiocoDiRuolo']").setAttribute("checked", true);
    if(res.serviceTrio)
        document.querySelector("input[name='serviceTrio']").setAttribute("checked", true);
    if(res.serviceSexting)
        document.querySelector("input[name='serviceSexting']").setAttribute("checked", true);
    if(res.serviceVideoChiamata)
        document.querySelector("input[name='serviceVideoChiamata']").setAttribute("checked", true);
    if(res.serviceUomini)
        document.querySelector("input[name='serviceUomini']").setAttribute("checked", true);
    if(res.serviceDonne)
        document.querySelector("input[name='serviceDonne']").setAttribute("checked", true);
    if(res.serviceCoppie)
        document.querySelector("input[name='serviceCoppie']").setAttribute("checked", true);
    if(res.serviceDisabili)
        document.querySelector("input[name='serviceDisabili']").setAttribute("checked", true);
    if(res.serviceACasa)
        document.querySelector("input[name='serviceACasa']").setAttribute("checked", true);
    if(res.serviceEventiEFeste)
        document.querySelector("input[name='serviceEventiEFeste']").setAttribute("checked", true);
    if(res.serviceAlbergoMotel)
        document.querySelector("input[name='serviceAlbergoMotel']").setAttribute("checked", true);
    if(res.serviceClubs)
        document.querySelector("input[name='serviceClubs']").setAttribute("checked", true);
    if(res.serviceVisitaADomicilio)
        document.querySelector("input[name='serviceVisitaADomicilio']").setAttribute("checked", true);
    if (res.hasWhatapp)
        document.querySelector("input[name='whatsapp']").setAttribute("checked", true);
    else
        document.querySelector("input[name='whatsapp']").removeAttribute("checked");
    if (res.hasTelegram)
        document.querySelector("input[name='telegram']").setAttribute("checked", true);
    else
        document.querySelector("input[name='telegram']").removeAttribute("checked");
    document.querySelector("select[name='city']").value = res.city;

    if(res.categorie){
        document.querySelector("select[name='categorie']").value = res.categorie;
    }

    if (res.isPhoneChecked) phoneApprove();

    if (EDIT == "true"){
        setTimeout(() => {
            alert("Il numero di telefono non'è stato trovato, perfavore completa l'annuncio manualmente prima di procedere.")
            startEditPost();
            //$("#btnUpdateSchedul").hide();
        }, 500);
    }else{
        $(".widget-after").show(()=>{
            $('html,body').animate({
                scrollTop: $(".widget-after").offset().top
            }, 'fast');
        });
    }    

    if (res.storagePics) {
        await loadStoragePics(res.phone);
    } else {
        if (res.images)
        res.images.forEach((img) => {
            addImage(img.src, img.id, img.isHidden, img.applyPhone);
        });
    };
    pubs = res.schedule !== undefined ? res.schedule : {};
    if (JSON.stringify(pubs) !== "{}")
        loadDay(document.querySelector("#txtDate").value);
    setTimeout(() => {
        $("#updateInfoBtn").prop("disabled", true);
        document.querySelector("input[name='phone']").setAttribute("disabled", true);
        // document.querySelectorAll(".input-editor").forEach(btn => {
        //     const inputEl = document.querySelector(`.form-control[name="${btn.parentElement.attributes.for.value}"]`);
        //     inputEl.setAttribute("disabled", true);
        // });
    }, 300);
}

async function loadStoragePics (phone) {
    for (let i = 0;;i++) {
        const { status } = await fetch(`/images/get?phone=${phone}&index=${i}`);
        if (status !== 200) break;
        addImage(`/images/get?phone=${phone}&index=${i}`);
    }
};

// document.querySelectorAll(".input-editor").forEach((btn) => {
//     const inputEl = document.querySelector(`.form-control[name="${btn.parentElement.attributes.for.value}"]`)
//     btn.addEventListener("click", () => {
//         if (inputEl.hasAttribute("disabled")) {
//             btn.setAttribute("class", "input-editor btn btn-success");
//             inputEl.removeAttribute("disabled");
//             btn.querySelector("img").src = "/assets/tick.svg";
//             enableInfoUpdate();
//             return inputEl.focus();
//         }
//         btn.querySelector("img").src = "/assets/pencil.svg";
//         btn.setAttribute("class", "input-editor btn btn-primary");
//         inputEl.setAttribute("disabled", true);
//     });
//     if (inputEl.attributes.name.value == "description") return;
//     inputEl.addEventListener("keyup", (e) => {
//         if (e.keyCode !== 13) return;
//         btn.click();
//     });
// });
$(".promoType>ul>li").on("click", (me)=>{
    $("#wizar-body").css("background-color", $(me.target).css("background-color"));
})

String.prototype.contains = function (text) {
    var index = this.indexOf(text);

    if (index === -1) {
        return false
    } else {
        return true
    }
};

function updateInfo (save) {
    var dataAnnuncio = getInfoData();
    console.log("1", {dataAnnuncio})
    var phoneNumber = parseInt(dataAnnuncio.phone, phoneNumber);
    if (!phoneNumber || dataAnnuncio.phone.indexOf(" ") != -1 || dataAnnuncio.phone.indexOf("/") != -1 || dataAnnuncio.phone.indexOf(".") != -1 || dataAnnuncio.phone.indexOf(",") != -1){
        ShowAlert("custom", "Verifica il numero di telefono inserito.");
        return false;
    }
    let exit = false;
    let logBlack = "Il testo: ";
    $(blacklist).each((i, x)=>{
        switch(true){
            case x.target.contains("Titolo"):
                switch(true){
                    case x.typeMatch.contains("Contiene"):
                        if ($("#txtTitle").val().contains(x.text)){
                            exit = true;
                            logBlack += x.text;
                            logBlack += ", non deve essere contenuto nel titolo.";
                            break;
                        }
                    case x.typeMatch.contains("Inizia per"):
                        if ($("#txtTitle").val().indexOf(x.text) == 0){
                            exit = true;
                            logBlack += x.text;
                            logBlack += ", non può essere usato per iniziare il titolo.";
                            break;
                        }
                    case x.typeMatch.contains("Uguale"):
                        if ($("#txtTitle").val() == x.text){
                            exit = true;
                            logBlack += x.text;
                            logBlack += ", non può essere il titolo.";
                            break;
                        }
                }
            case x.target.contains("Descrizione"):
                switch(true){
                    case x.typeMatch.contains("Contiene"):
                        if ($("#txtDescription").val().contains(x.text)){
                            exit = true;
                            logBlack += x.text;
                            logBlack += ", non deve essere contenuto nella descrizione.";
                            break;
                        }
                    case x.typeMatch.contains("Inizia per"):
                        if ($("#txtDescription").val().indexOf(x.text) == 0){
                            exit = true;
                            logBlack += x.text;
                            logBlack += ", non può essere usato per iniziare la descrizione.";
                            break;
                        }
                    case x.typeMatch.contains("Uguale"):
                        if ($("#txtDescription").val() == x.text){
                            exit = true;
                            logBlack += x.text;
                            logBlack += ", non può essere la descrizione.";
                            break;
                        }
                }
        }
    });
    if(exit){
        ShowAlert("custom", logBlack);
        return false;
    }

    if (document.querySelector(".phone-wrapper .btn").classList.contains("btn-secondary"))
        return contactVerify(save);
        let anID = 0;
        if(QUERY_NEW){
            anID = parseInt(QUERY_NEW);
        }
        toggleLoader();
    fetch("/annuncio/updateInfo", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ info: getInfoData() , id: anID }),
    }).then((r) => {
        toggleLoader();
        if (r.status === 405) return alert(
            "📝 Assicurati prima di aver compilato correttamente tutte le informazioni relative all'annuncio!",
        );
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento dati da URL",
        );
        document.querySelector("#updateInfoBtn").setAttribute("disabled", true);
        //alert("ℹ️ Informazioni aggiornate correttamente.");
        ShowAlert("lblSaved");
        r.json().then(async (res) => {
            window.location.href = "/annuncio.html?edit=" + res.id;
        });
    });
};

const getInfoData = () => {
    return {
        city: document.querySelector("select[name='city']").value,
        location: document.querySelector("input[name='location']").value,
        age: document.querySelector("input[name='age']").value,
        title: document.querySelector("textarea[name='title']").value,
        nickname: document.querySelector("textarea[name='nickname']").value,
        description: document.querySelector("textarea[name='description']").value,
        phone: document.querySelector("input[name='phone']").value,
        whatsapp: document.querySelector("input[name='whatsapp']").checked,
        telegram: document.querySelector("input[name='telegram']").checked,
        name: document.querySelector("input[name='name']").value,
        categorie: document.querySelector("select[name='categorie']").value,
        note: document.querySelector("textarea[name='note']").value,
        serviceAfricana: document.querySelector("input[name='serviceAfricana']").checked,
        serviceIndiana: document.querySelector("input[name='serviceIndiana']").checked,
        serviceAsiatica: document.querySelector("input[name='serviceAsiatica']").checked,
        serviceAraba: document.querySelector("input[name='serviceAraba']").checked,
        serviceLatina: document.querySelector("input[name='serviceLatina']").checked,
        serviceCaucasica: document.querySelector("input[name='serviceCaucasica']").checked,
        serviceItaliana: document.querySelector("input[name='serviceItaliana']").checked,
        serviceSNaturale: document.querySelector("input[name='serviceSNaturale']").checked,
        serviceSRifatto: document.querySelector("input[name='serviceSRifatto']").checked,
        serviceCBiondi: document.querySelector("input[name='serviceCBiondi']").checked,
        serviceCMarroni: document.querySelector("input[name='serviceCMarroni']").checked,
        serviceCNeri: document.querySelector("input[name='serviceCNeri']").checked,
        serviceCRossi: document.querySelector("input[name='serviceCRossi']").checked,
        serviceMagro: document.querySelector("input[name='serviceMagro']").checked,
        serviceFormoso: document.querySelector("input[name='serviceFormoso']").checked,

        serviceCash: document.querySelector("input[name='serviceCash']").checked,
        serviceCreditCard: document.querySelector("input[name='serviceCreditCard']").checked,
        hourlyPrice: document.querySelector("select[name='hourlyPrice']").value,

        serviceNazionalita: document.querySelector("select[name='serviceNazionalita']").value,
        serviceOrale: document.querySelector("input[name='serviceOrale']").checked,
        serviceAnale: document.querySelector("input[name='serviceAnale']").checked,
        serviceSadomaso: document.querySelector("input[name='serviceSadomaso']").checked,
        serviceEsperienzaFidanzata: document.querySelector("input[name='serviceEsperienzaFidanzata']").checked,
        serviceAttriciPorno: document.querySelector("input[name='serviceAttriciPorno']").checked,
        serviceEiaculazioneSulCorpo: document.querySelector("input[name='serviceEiaculazioneSulCorpo']").checked,
        serviceMassaggioErotico: document.querySelector("input[name='serviceMassaggioErotico']").checked,
        serviceMassaggioTantrico: document.querySelector("input[name='serviceMassaggioTantrico']").checked,
        serviceFetish: document.querySelector("input[name='serviceFetish']").checked,
        serviceBacioAllaFrancese: document.querySelector("input[name='serviceBacioAllaFrancese']").checked,
        serviceGiocoDiRuolo: document.querySelector("input[name='serviceGiocoDiRuolo']").checked,
        serviceTrio: document.querySelector("input[name='serviceTrio']").checked,
        serviceSexting: document.querySelector("input[name='serviceSexting']").checked,
        serviceVideoChiamata: document.querySelector("input[name='serviceVideoChiamata']").checked,
        serviceUomini: document.querySelector("input[name='serviceUomini']").checked,
        serviceDonne: document.querySelector("input[name='serviceDonne']").checked,
        serviceCoppie: document.querySelector("input[name='serviceCoppie']").checked,
        serviceDisabili: document.querySelector("input[name='serviceDisabili']").checked,
        serviceACasa: document.querySelector("input[name='serviceACasa']").checked,
        serviceEventiEFeste: document.querySelector("input[name='serviceEventiEFeste']").checked,
        serviceAlbergoMotel: document.querySelector("input[name='serviceAlbergoMotel']").checked,
        serviceClubs: document.querySelector("input[name='serviceClubs']").checked,
        serviceVisitaADomicilio: document.querySelector("input[name='serviceVisitaADomicilio']").checked
    };
};

const startPhoneLoading = () => {
    document.querySelector("#verify-button").setAttribute("disabled", true);
    $(".phone-panel > p").text("In corso..");
    // document.querySelector("#verify-button span").classList.add("transparent");
    // document.querySelector("#verify-button svg").classList.remove("disabled");
};
const stopPhoneLoading = () => {
    document.querySelector("#verify-button").removeAttribute("disabled");
    $(".phone-panel > p").text("Verifica");
    // document.querySelector("#verify-button span").classList.remove("transparent");
    // document.querySelector("#verify-button svg").classList.add("disabled");
};
const phoneApprove = (save) => {
    //if (document.querySelector("#verify-button").classList.contains("btn-success")) return;
    stopPhoneLoading();
    $(".phone-panel > p").text("Verificato");
    document.querySelector("#verify-button").innerHTML = "<i class='fa fa-check'></i>";
    document.querySelector("#verify-button").setAttribute("disabled", true);
    document.querySelector("#verify-button").setAttribute("class", "btn btn-success");
    if(save){
        updateInfo();
    }
};

const phoneCancel = () => {
    document.querySelector("#verify-button").innerHTML = `
        <svg class="disabled" id="dots" height="28px" viewBox="0 0 132 58" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage">
                <g id="dots" sketch:type="MSArtboardGroup" fill="#FFF">
                    <circle id="dot1" sketch:type="MSShapeGroup" cx="25" cy="30" r="13"></circle>
                    <circle id="dot2" sketch:type="MSShapeGroup" cx="65" cy="30" r="13"></circle>
                    <circle id="dot3" sketch:type="MSShapeGroup" cx="105" cy="30" r="13"></circle>
                </g>
            </g>
        </svg>
        <span><i class="fa fa-arrow-right"></i></span>
    `;
    document.querySelector("#verify-button").removeAttribute("disabled");
    document.querySelector("#verify-button").setAttribute("class", "btn btn-secondary");
};
document.querySelector("select[name='city']").addEventListener("change", phoneCancel);

const startTestPhoneLoading = () => {
    document.querySelector("#test-button").setAttribute("disabled", true);
    document.querySelector("#test-button span").classList.add("transparent");
    document.querySelector("#test-button svg").classList.remove("disabled");
};
const stopTestPhoneLoading = () => {
    document.querySelector("#test-button").removeAttribute("disabled");
    document.querySelector("#test-button span").classList.remove("transparent");
    document.querySelector("#test-button svg").classList.add("disabled");
};
const phoneTestApprove = () => {
    stopPhoneLoading();
    document.querySelector("#test-button").innerHTML = "<i class='fa fa-check'></i>";
    document.querySelector("#test-button").setAttribute("disabled", true);
    document.querySelector("#test-button").setAttribute("class", "btn btn-success");
};

const setDefaultDatetime = (timeInput) => {
    timeInput.value = new Date().toLocaleTimeString("it", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

document.querySelectorAll(".promoPanel .newpost-wrapper").forEach((p) => {
    setDefaultDatetime(
        p.querySelector("input[type='time']"),
    );
});

const getCheckedPics = (checkbox) => {
    let result = 0;
    checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
        if (c.checked) result++;
    });
    return result;
};

const postsPanelOperations = (panel) => {
    panel.querySelector(".btn-primary").addEventListener("click", () => {
        enableScheduleUpdate();
        const newPostPanel = document.createElement("div");
        newPostPanel.classList.add("newpost-panel");
        //Aggiungo città di default dell'annuncio
        $(newPostPanel).data("city", document.querySelector("select[name='city']").value);
        $(newPostPanel).attr("data-city", document.querySelector("select[name='city']").value);
        $(newPostPanel).data("cam", false);
        $(newPostPanel).attr("data-cam", false);
        $(newPostPanel).data("premium", false);
        $(newPostPanel).attr("data-premium", false);
        // Add initialization for highlight and etichetta
        $(newPostPanel).data("highlight", false);
        $(newPostPanel).attr("data-highlight", false);
        $(newPostPanel).data("etichetta", false);
        $(newPostPanel).attr("data-etichetta", false);
        tmpID = tmpID + 1;
        $(newPostPanel).data("relativeID", tmpID);
        $(newPostPanel).attr("data-relativeID", tmpID);
        const newPost = document.createElement("div");
        newPost.classList.add("newpost-wrapper");

        const cityPost = dropCities(document.querySelector("select[name='city']").value);
        cityPost.classList.add("form-control");
        cityPost.style.marginLeft = "12px";
        cityPost.style.width = "120px";
        const dateTime = document.createElement("label");
        dateTime.innerText = `${$("#txtDate").val()} `;
        dateTime.classList.add("lblDateTime");
        const timeInput = document.createElement("input");
        timeInput.classList.add("form-control");
        timeInput.setAttribute("type", "time");
        setDefaultDatetime(timeInput);
        const delButton = document.createElement("button");
        delButton.classList.add("btn");
        delButton.classList.add("btn-danger");
        delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;
        const picsButton = document.createElement("button");
        picsButton.classList.add("btn");
        picsButton.classList.add("btn-dark");
        picsButton.classList.add("btnPhoto");
        picsButton.innerHTML = `<i class='fa fa-camera'></i>`;
        const btnPremium = document.createElement("button");
        btnPremium.classList.add("btn");
        btnPremium.classList.add("btn-default");
        btnPremium.classList.add("btnPremium");
        btnPremium.innerHTML = `<i class='fa fa-gem'></i>`;

        const btnHighlight = document.createElement("button");
        btnHighlight.classList.add("btn");
        btnHighlight.classList.add("btn-default");
        btnHighlight.classList.add("btnHighlight");
        btnHighlight.innerHTML = `<i class='fa fa-solid fa-id-card'></i>`;
        const btnEtichetta = document.createElement("button");
        btnEtichetta.classList.add("btn");
        btnEtichetta.classList.add("btn-default");
        btnEtichetta.classList.add("btnEtichetta");
        btnEtichetta.innerHTML = `<i class='fa fa-tag'></i>`;
        
        const btnCam = document.createElement("button");
        btnCam.classList.add("btn");
        btnCam.classList.add("btn-default");
        btnCam.classList.add("btnCam");
        btnCam.innerHTML = `<i class='fa fa-video'></i>`;


        picsButton.addEventListener("click", () => {
            enableScheduleUpdate();
            const postPanel = picsButton.parentElement.parentElement;
            const isEnabled = picsButton.classList.contains("btn-dark");
            picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
            if (!isEnabled) {
                return postPanel.querySelector(".post-pics").remove();
            };

            const postPics = document.createElement("div");
            postPics.classList.add("post-pics");

            var anteprimaSel = false;
            document.querySelectorAll(".persistent .pic-panel img").forEach((picEl) => {
                const picId = btoa(Math.random().toString()).substr(10, 16);


                const postPicWrapper = document.createElement("div");
                postPicWrapper.classList.add("post-pic-wrapper");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("form-check-input");
                checkbox.id = picId;
                checkbox.checked = true;
                $(checkbox).attr("data-id", $(picEl).parents(".pic-panel").data("id"));
                const label = document.createElement("label");
                label.setAttribute("for", picId);
                const postImgEl = document.createElement("img");
                postImgEl.src = picEl.src;

                const btnAnteprima = document.createElement("button");
                btnAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                btnAnteprima.innerHTML = "ANTEPRIMA";
                checkbox.addEventListener("click", () => {
                    $(checkbox).parents(".newpost-panel").attr("data-state", "EDIT");
                    enableScheduleUpdate();
                    const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                    const checkedPics = getCheckedPics(checkbox);
                    if (checkbox.checked) {
                        if (checkedPics >= 5) {
                            checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                                if (c.checked) return;
                                c.setAttribute("disabled", true);
                            });
                        };
                        if (currentAnteprima) return;
                        thisAnteprimaButton.setAttribute("class", "btn btn-warning btn-anteprima");
                        return;
                    };
                    checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                        c.removeAttribute("disabled");
                    });
                    if (!thisAnteprimaButton.classList.contains("btn-warning")) return;
                    thisAnteprimaButton.setAttribute("class", "btn btn-secondary btn-anteprima");
                    const picWrappers = checkbox.parentElement.parentElement.querySelectorAll(".post-pic-wrapper");
                    for (let picWrapper of picWrappers) {
                        if (picWrapper.querySelector("input").checked)
                            return picWrapper.querySelector("button").setAttribute("class", "btn btn-warning btn-anteprima");
                    };
                });
                btnAnteprima.addEventListener("click", () => {
                    enableScheduleUpdate();
                    $(btnAnteprima).parents(".newpost-panel").attr("data-state", "EDIT");
                    if (!$(btnAnteprima).parent().find("input").is(":checked")) {
                        const checkedPics = getCheckedPics(checkbox);
                        if (checkedPics >= 5) return;
                        btnAnteprima.parentElement.querySelector("input").click();
                    }
                    if (btnAnteprima.classList.contains("btn-warning")) return;
                    const currentAnteprima = btnAnteprima.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    if (currentAnteprima)
                        currentAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                    btnAnteprima.setAttribute("class", "btn btn-warning btn-anteprima");
                });

                postPicWrapper.appendChild(checkbox);
                postPicWrapper.appendChild(label);
                postPicWrapper.appendChild(btnAnteprima);
                label.appendChild(postImgEl);
                postPics.appendChild(postPicWrapper);

                if (!anteprimaSel){
                    btnAnteprima.click();
                    anteprimaSel = true;
                }
            });

            postPanel.appendChild(postPics);
        });

        delButton.addEventListener("click", () => {
            //newPostPanel.remove();
            $(newPostPanel).hide();
            $(newPostPanel).data("GCRecord", true);
            enableScheduleUpdate();
        });

        btnPremium.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnPremium).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnPremium, true);
        });

        btnHighlight.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnHighlight).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnHighlight, false, true);
        });

        btnEtichetta.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnEtichetta).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnEtichetta, false, false, true);
        });

        btnCam.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnCam).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnCam, false);
        });

        cityPost.addEventListener("change", (x) =>{
            enableScheduleUpdate();
            $(cityPost).parents(".newpost-panel").attr("data-state", "EDIT");
            $(cityPost).parents(".newpost-panel").attr("data-city", x.currentTarget.value);
            $(cityPost).parents(".newpost-panel").data("city", x.currentTarget.value);
        });

        newPost.appendChild(dateTime);
        newPost.appendChild(timeInput);
        newPost.appendChild(delButton);
        newPost.appendChild(picsButton);
        newPost.appendChild(btnPremium);
        newPost.appendChild(btnHighlight);
        newPost.appendChild(btnEtichetta);
        newPost.appendChild(btnCam);
        newPost.appendChild(cityPost);
        newPostPanel.appendChild(newPost);

        panel.querySelector(".post-list").appendChild(newPostPanel);
    });
}
document.querySelectorAll(".posts").forEach(postsPanelOperations);

const togglePremiumCam = (btn, premium, highlight, etichetta) => {
    const postPanel = $(btn).parents(".newpost-panel");
    console.log('toggling', {btn, premium, highlight, etichetta});
    if($(btn).hasClass("btn-success")){
        $(btn).attr("class", "btn btn-default");
        if(premium){
            postPanel.data("premium", false);
            postPanel.attr("data-premium", false);
        }
        if(highlight){
            postPanel.data("highlight", false);
            postPanel.attr("data-highlight", false);
        }
        if(etichetta){
            postPanel.data("etichetta", false);
            postPanel.attr("data-etichetta", false);
        }
        if(!premium && !highlight && !etichetta){
            postPanel.data("cam", false);
            postPanel.attr("data-cam", false);
        }
    } else {
        $(btn).attr("class", "btn btn-success");
        if(premium){
            postPanel.data("premium", true);
            postPanel.attr("data-premium", true);
        }
        if(highlight){
            postPanel.data("highlight", true);
            postPanel.attr("data-highlight", true);
        }
        if(etichetta){
            postPanel.data("etichetta", true);
            postPanel.attr("data-etichetta", true);
        }
        if(!premium && !highlight && !etichetta){
            postPanel.data("cam", true);
            postPanel.attr("data-cam", true);
        }
    }    
}

const timeSlotPanelOperations = (panel) => {
    panel.querySelector(".btn-primary").addEventListener("click", () => {
        enableScheduleUpdate();
        const newPostPanel = document.createElement("div");
        newPostPanel.classList.add("newpost-panel");
        $(newPostPanel).data("city", document.querySelector("select[name='city']").value);
        $(newPostPanel).attr("data-city", document.querySelector("select[name='city']").value);
        $(newPostPanel).data("cam", false);
        $(newPostPanel).attr("data-cam", false);
        $(newPostPanel).data("premium", false);
        $(newPostPanel).attr("data-premium", false);
        $(newPostPanel).data("highlight", false);
        $(newPostPanel).attr("data-highlight", false);
        $(newPostPanel).data("etichetta", false);
        $(newPostPanel).attr("data-etichetta", false);
        tmpID = tmpID + 1;
        $(newPostPanel).data("relativeID", tmpID);
        $(newPostPanel).attr("data-relativeID", tmpID);
        const newPost = document.createElement("div");
        newPost.classList.add("newpost-wrapper");
        const cityPost = dropCities(document.querySelector("select[name='city']").value);
        cityPost.classList.add("form-control");
        cityPost.style.marginLeft = "12px";
        cityPost.style.width = "120px";
        const dateTime = document.createElement("label");
        dateTime.innerText = `${$("#txtDate").val()} `;
        dateTime.classList.add("lblDateTime");
        const timeInput = document.createElement("input");
        timeInput.classList.add("form-control");
        timeInput.setAttribute("type", "time");
        timeInput.value = panel.querySelector(".btn-primary").parentElement.parentElement.querySelector("label").innerText.split("-")[0].trim();
        // setDefaultDatetime(timeInput);
        const delButton = document.createElement("button");
        delButton.classList.add("btn");
        delButton.classList.add("btn-danger");
        delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;
        const picsButton = document.createElement("button");
        picsButton.classList.add("btn");
        picsButton.classList.add("btn-dark");
        picsButton.classList.add("btnPhoto");
        picsButton.innerHTML = `<i class='fa fa-camera'></i>`;
        const btnPremium = document.createElement("button");
        btnPremium.classList.add("btn");
        btnPremium.classList.add("btn-default");
        btnPremium.classList.add("btnPremium");
        btnPremium.innerHTML = `<i class='fa fa-gem'></i>`;

        const btnHighlight = document.createElement("button");
        btnHighlight.classList.add("btn");
        btnHighlight.classList.add("btn-default");
        btnHighlight.classList.add("btnHighlight");
        btnHighlight.innerHTML = `<i class='fa fa-solid fa-id-card'></i>`;

        const btnEtichetta = document.createElement("button");
        btnEtichetta.classList.add("btn");
        btnEtichetta.classList.add("btn-default");
        btnEtichetta.classList.add("btnEtichetta");
        btnEtichetta.innerHTML = `<i class='fa fa-tag'></i>`;

        const btnCam = document.createElement("button");
        btnCam.classList.add("btn");
        btnCam.classList.add("btn-default");
        btnCam.classList.add("btnCam");
        btnCam.innerHTML = `<i class='fa fa-video'></i>`;
        picsButton.addEventListener("click", () => {
            enableScheduleUpdate();
            const postPanel = picsButton.parentElement.parentElement;
            const isEnabled = picsButton.classList.contains("btn-dark");
            picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
            if (!isEnabled) {
                return postPanel.querySelector(".post-pics").remove();
            };

            const postPics = document.createElement("div");
            postPics.classList.add("post-pics");

            var anteprimaSel = false;
            document.querySelectorAll(".persistent .pic-panel img").forEach((picEl) => {
                const picId = btoa(Math.random().toString()).substr(10, 16);

                const postPicWrapper = document.createElement("div");
                postPicWrapper.classList.add("post-pic-wrapper");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("form-check-input");
                checkbox.id = picId;
                checkbox.checked = true;
                $(checkbox).attr("data-id", $(picEl).parents(".pic-panel").data("id"));
                const label = document.createElement("label");
                label.setAttribute("for", picId);
                const postImgEl = document.createElement("img");
                postImgEl.src = picEl.src;

                const btnAnteprima = document.createElement("button");
                btnAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                btnAnteprima.innerHTML = "ANTEPRIMA";
                checkbox.addEventListener("click", () => {
                    $(checkbox).parents(".newpost-panel").attr("data-state", "EDIT");
                    enableScheduleUpdate();
                    const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                    const checkedPics = getCheckedPics(checkbox);
                    if (checkbox.checked) {
                        if (checkedPics >= 5) {
                            checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                                if (c.checked) return;
                                c.setAttribute("disabled", true);
                            });
                        };
                        if (currentAnteprima) return;
                        thisAnteprimaButton.setAttribute("class", "btn btn-warning btn-anteprima");
                        return;
                    };
                    checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                        c.removeAttribute("disabled");
                    });
                    if (!thisAnteprimaButton.classList.contains("btn-warning")) return;
                    thisAnteprimaButton.setAttribute("class", "btn btn-secondary btn-anteprima");
                    const picWrappers = checkbox.parentElement.parentElement.querySelectorAll(".post-pic-wrapper");
                    for (let picWrapper of picWrappers) {
                        if (picWrapper.querySelector("input").checked)
                            return picWrapper.querySelector("button").setAttribute("class", "btn btn-warning btn-anteprima");
                    };
                });
                btnAnteprima.addEventListener("click", () => {
                    enableScheduleUpdate();
                    $(btnAnteprima).parents(".newpost-panel").attr("data-state", "EDIT");
                    if (!btnAnteprima.parentElement.querySelector("input").checked) {
                        const checkedPics = getCheckedPics(btnAnteprima);
                        if (checkedPics >= 5) return;
                        btnAnteprima.parentElement.querySelector("input").click();
                    }
                    if (btnAnteprima.classList.contains("btn-warning")) return;
                    const currentAnteprima = btnAnteprima.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    if (currentAnteprima)
                        currentAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                    btnAnteprima.setAttribute("class", "btn btn-warning btn-anteprima");
                });

                postPicWrapper.appendChild(checkbox);
                postPicWrapper.appendChild(label);
                postPicWrapper.appendChild(btnAnteprima);
                label.appendChild(postImgEl);
                postPics.appendChild(postPicWrapper);
                
                if(!anteprimaSel){
                    btnAnteprima.click();
                    anteprimaSel = true;
                }
            });

            postPanel.appendChild(postPics);
        });

        delButton.addEventListener("click", () => {
            enableScheduleUpdate();
            if (panel.querySelectorAll(".newpost-wrapper").length === 1) {
                panel.parentElement.querySelector("input").click();
            }
            //newPostPanel.remove();
            $(newPostPanel).fadeOut();
            $(newPostPanel).data("GCRecord", true);
        });

        btnPremium.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnPremium).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnPremium, true);
        });

        btnHighlight.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnHighlight).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnHighlight, false, true);
        });

        btnEtichetta.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnEtichetta).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnEtichetta, false, false, true);
        });

        btnCam.addEventListener("click", () => {
            enableScheduleUpdate();
            $(btnCam).parents(".newpost-panel").attr("data-state", "EDIT");
            togglePremiumCam(btnCam, false);
        });

        cityPost.addEventListener("change", (x) =>{
            enableScheduleUpdate();
            $(cityPost).parents(".newpost-panel").attr("data-state", "EDIT");
            $(cityPost).parents(".newpost-panel").attr("data-city", x.currentTarget.value);
            $(cityPost).parents(".newpost-panel").data("city", x.currentTarget.value);
        });

        newPost.appendChild(dateTime);
        newPost.appendChild(timeInput);
        newPost.appendChild(delButton);
        newPost.appendChild(picsButton);
        newPost.appendChild(btnPremium);
        newPost.appendChild(btnHighlight);
        newPost.appendChild(btnEtichetta);
        newPost.appendChild(btnCam);
        newPost.appendChild(cityPost);
        newPostPanel.appendChild(newPost);

        panel.querySelector(".post-list").appendChild(newPostPanel);
    });
    const newSinglePanel = panel.querySelector(".newpost-wrapper:first-child");
    newSinglePanel.querySelector(".btn-danger").addEventListener("click", () => {
        if (panel.querySelectorAll(".newpost-wrapper").length == 1)
            panel.parentElement.querySelector("input").click();
        //newSinglePanel.parentElement.remove();
        $(newSinglePanel.parentElement).fadeOut();
        $(newSinglePanel.parentElement).data("GCRecord", true);
    });
}
document.querySelectorAll(".time-slot").forEach((timeslot) => {
    const checkbox = timeslot.querySelector(".flex-checkbox input");
    checkbox.addEventListener("click", () => {
        enableScheduleUpdate();
        if (!checkbox.checked) {
            $(timeslot).find(".posts").hide();
            $(timeslot).find(".posts").find(".newpost-panel").data("GCRecord", true);
        }else{
            const postsDiv = document.createElement("div");
            postsDiv.classList.add("posts");
            const postsListDiv = document.createElement("div");
            postsListDiv.classList.add("post-list");
            const newPostPanel = document.createElement("div");
            newPostPanel.classList.add("newpost-panel");
            $(newPostPanel).data("city", document.querySelector("select[name='city']").value);
            $(newPostPanel).attr("data-city", document.querySelector("select[name='city']").value);
            $(newPostPanel).data("cam", false);
            $(newPostPanel).attr("data-cam", false);
            $(newPostPanel).data("premium", false);
            $(newPostPanel).attr("data-premium", false);
            // Add initialization for highlight and etichetta
            $(newPostPanel).data("highlight", false);
            $(newPostPanel).attr("data-highlight", false);
            $(newPostPanel).data("etichetta", false);
            $(newPostPanel).attr("data-etichetta", false);
            tmpID = tmpID + 1;
            $(newPostPanel).data("relativeID", tmpID);
            $(newPostPanel).attr("data-relativeID", tmpID);
            const newPostWrapper = document.createElement("div");
            newPostWrapper.classList.add("newpost-wrapper");
            const cityPost = dropCities(document.querySelector("select[name='city']").value);
            cityPost.classList.add("form-control");
            cityPost.style.marginLeft = "12px";
            cityPost.style.width = "120px";
            const dateTime = document.createElement("label");
            dateTime.innerText = `${$("#txtDate").val()} `;
            dateTime.classList.add("lblDateTime");
            const timeInput = document.createElement("input");
            timeInput.classList.add("form-control");
            timeInput.setAttribute("type", "time");
            timeInput.value = checkbox.parentElement.querySelector("label").innerText.split("-")[0].trim();
            // setDefaultDatetime(timeInput);
            const delButton = document.createElement("button");
            delButton.classList.add("btn");
            delButton.classList.add("btn-danger");
            delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;
            const picsButton = document.createElement("button");
            picsButton.classList.add("btn");
            picsButton.classList.add("btn-dark");
            picsButton.classList.add("btnPhoto");
            picsButton.innerHTML = `<i class='fa fa-camera'></i>`;
            const addButton = document.createElement("button");
            addButton.classList.add("btn");
            addButton.classList.add("btn-primary");
            addButton.innerHTML = "<b>+</b>";
            const btnPremium = document.createElement("button");
            btnPremium.classList.add("btn");
            btnPremium.classList.add("btn-default");
            btnPremium.classList.add("btnPremium");
            btnPremium.innerHTML = `<i class='fa fa-gem'></i>`;

            const btnHighlight = document.createElement("button");
            btnHighlight.classList.add("btn");
            btnHighlight.classList.add("btn-default");
            btnHighlight.classList.add("btnHighlight");
            btnHighlight.innerHTML = `<i class='fa fa-solid fa-id-card'></i>`;

            const btnEtichetta = document.createElement("button");
            btnEtichetta.classList.add("btn");
            btnEtichetta.classList.add("btn-default");
            btnEtichetta.classList.add("btnEtichetta");
            btnEtichetta.innerHTML = `<i class='fa fa-tag'></i>`;

            const btnCam = document.createElement("button");
            btnCam.classList.add("btn");
            btnCam.classList.add("btn-default");
            btnCam.classList.add("btnCam");
            btnCam.innerHTML = `<i class='fa fa-video'></i>`;
    
            picsButton.addEventListener("click", () => {
                const postPanel = picsButton.parentElement.parentElement;
                const isEnabled = picsButton.classList.contains("btn-dark");
                picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
                if (!isEnabled) {
                    return postPanel.querySelector(".post-pics").remove();
                };
    
                const postPics = document.createElement("div");
                postPics.classList.add("post-pics");
    
                document.querySelectorAll(".persistent .pic-panel img").forEach((picEl) => {
                    const picId = btoa(Math.random().toString()).substr(10, 16);
    
                    const postPicWrapper = document.createElement("div");
                    postPicWrapper.classList.add("post-pic-wrapper");
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.classList.add("form-check-input");
                    checkbox.id = picId;
                    checkbox.checked = true;
                    $(checkbox).attr("data-id", $(picEl).parents(".pic-panel").data("id"));
                    const label = document.createElement("label");
                    label.setAttribute("for", picId);
                    const postImgEl = document.createElement("img");
                    postImgEl.src = picEl.src;
    
                    const btnAnteprima = document.createElement("button");
                    btnAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                    btnAnteprima.innerHTML = "ANTEPRIMA";
                    checkbox.addEventListener("click", () => {
                        $(checkbox).parents(".newpost-panel").attr("data-state", "EDIT");
                        const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                        const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                        const checkedPics = getCheckedPics(checkbox);
                        if (checkbox.checked) {
                            if (checkedPics >= 5) {
                                checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                                    if (c.checked) return;
                                    c.setAttribute("disabled", true);
                                });
                            };
                            if (currentAnteprima) return;
                            thisAnteprimaButton.setAttribute("class", "btn btn-warning btn-anteprima");
                            return;
                        };
                        checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                            c.removeAttribute("disabled");
                        });
                        if (!thisAnteprimaButton.classList.contains("btn-warning")) return;
                        thisAnteprimaButton.setAttribute("class", "btn btn-secondary btn-anteprima");
                        const picWrappers = checkbox.parentElement.parentElement.querySelectorAll(".post-pic-wrapper");
                        for (let picWrapper of picWrappers) {
                            if (picWrapper.querySelector("input").checked)
                                return picWrapper.querySelector("button").setAttribute("class", "btn btn-warning btn-anteprima");
                        };
                    });
                    btnAnteprima.addEventListener("click", () => {
                        enableScheduleUpdate();
                        $(btnAnteprima).parents(".newpost-panel").attr("data-state", "EDIT");
                        if (!btnAnteprima.parentElement.querySelector("input").checked) {
                            const checkedPics = getCheckedPics(btnAnteprima);
                            if (checkedPics >= 5) return;
                            btnAnteprima.parentElement.querySelector("input").click();
                        }
                        if (btnAnteprima.classList.contains("btn-warning")) return;
                        const currentAnteprima = btnAnteprima.parentElement.parentElement.querySelector("button.btn.btn-warning");
                        if (currentAnteprima)
                            currentAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                        btnAnteprima.setAttribute("class", "btn btn-warning btn-anteprima");
                    });
    
                    postPicWrapper.appendChild(checkbox);
                    postPicWrapper.appendChild(label);
                    postPicWrapper.appendChild(btnAnteprima);
                    label.appendChild(postImgEl);
                    postPics.appendChild(postPicWrapper);
                });
    
                postPanel.appendChild(postPics);
            });
    
            btnPremium.addEventListener("click", () => {
                enableScheduleUpdate();
                $(btnPremium).parents(".newpost-panel").attr("data-state", "EDIT");
                togglePremiumCam(btnPremium, true);
            });

            btnHighlight.addEventListener("click", () => {
                enableScheduleUpdate();
                $(btnHighlight).parents(".newpost-panel").attr("data-state", "EDIT");
                togglePremiumCam(btnHighlight, false, true);
            });

            btnEtichetta.addEventListener("click", () => {
                enableScheduleUpdate();
                $(btnEtichetta).parents(".newpost-panel").attr("data-state", "EDIT");
                togglePremiumCam(btnEtichetta, false, false, true);
            });

            btnCam.addEventListener("click", () => {
                enableScheduleUpdate();
                $(btnCam).parents(".newpost-panel").attr("data-state", "EDIT");
                togglePremiumCam(btnCam, false);
            });

            cityPost.addEventListener("change", (x) =>{
                enableScheduleUpdate();
                $(cityPost).parents(".newpost-panel").attr("data-state", "EDIT");
                $(cityPost).parents(".newpost-panel").attr("data-city", x.currentTarget.value);
                $(cityPost).parents(".newpost-panel").data("city", x.currentTarget.value);
            });

            postsDiv.appendChild(postsListDiv);
            postsDiv.appendChild(addButton);
            newPostPanel.appendChild(newPostWrapper);
            postsListDiv.appendChild(newPostPanel);
            newPostWrapper.appendChild(dateTime);
            newPostWrapper.appendChild(timeInput);
            newPostWrapper.appendChild(delButton);
            newPostWrapper.appendChild(picsButton);
            newPostWrapper.appendChild(btnPremium);
            newPostWrapper.appendChild(btnHighlight);
            newPostWrapper.appendChild(btnEtichetta);
            newPostWrapper.appendChild(btnCam);
            newPostWrapper.appendChild(cityPost);
    
            timeSlotPanelOperations(postsDiv);
            timeslot.appendChild(postsDiv);
        }
        
    });
});

//document.querySelector(".phone-wrapper .btn").addEventListener("click", contactVerify);
$(".phone-wrapper .btn").on("click", function(){
    contactVerify(false);
});
async function contactVerify(save) {
    startPhoneLoading();
    // 201: check / sendcode operations pending
    // 204: contact successfully verified
    // 202: nothing new, retry later
    // 402: waiting for code
    // 403: invalid code sent

    setTimeout(async () => {
        if (document.querySelector("select[name='city']").value === "Seleziona una città") {
            stopPhoneLoading();
            return ShowAlert("custom", "📍 Seleziona una città prima di poter verificare il numero di telefono.");//alert("📍 Seleziona una città prima di poter verificare il numero di telefono.")
        };

        let operation = {
            id: btoa(Math.random().toString()).substr(10, 16),
            action: "check",
            status: false,
            approved: false,
            code: undefined,
            //phone: document.querySelector(".phone-wrapper input").value,
            phone: document.querySelector("input[name='phone']").value.replace(/\s+/g, ''),
            city: document.querySelector("select[name='city']").value,
        }
        if (isNaN(operation.phone)) {
            stopPhoneLoading();
            return ShowAlert("custom", "❌ Il numero di telefono inserito non è valido.");//alert("❌ Il numero di telefono inserito non è valido.");
        };

        await fetch("/contactVerify", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({ operation , key: localStorage.getItem("key") }),
        });

        let res;
        while (true) {
            res = await fetch("/contactVerify", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify({ operation , key: localStorage.getItem("key") }),
            });
            if (res.status !== 202) break;
            sleep(3);
        };
        if (res.status === 204)
            return phoneApprove(save);
        
        let verifyCode;
        let firstTime = true;
        while (true) {
            verifyCode = prompt(firstTime ? "Inserisci il codice di verifica:" : "Codice errato.\nInserisci di nuovo il codice di verifica.");
            if (verifyCode == null){
                stopPhoneLoading();
                await fetch("/contactVerify", {
                    method: "POST",
                    mode: "cors",
                    cache: "no-cache",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    redirect: "follow",
                    referrerPolicy: "no-referrer",
                    body: JSON.stringify({ operation: {...operation, code: "cancel"} , key: localStorage.getItem("key") }),
                });
                return ShowAlert("custom", "❌ Il numero di telefono non'e' stato verificato.");
            }
            await fetch("/contactVerify", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify({ operation: {...operation, code: verifyCode} , key: localStorage.getItem("key") }),
            });

            while (true) {
                res = await fetch("/contactVerify", {
                    method: "POST",
                    mode: "cors",
                    cache: "no-cache",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    redirect: "follow",
                    referrerPolicy: "no-referrer",
                    body: JSON.stringify({ operation: {...operation, code: verifyCode} , key: localStorage.getItem("key") }),
                });
                if (res.status !== 202) break;
                sleep(3);
            };
            if (res.status === 204)
                return phoneApprove(save);
            firstTime = false;
        };
    }, 200);
};

// IMAGE UPLOAD
function addImage(imgUrl, idDB, isHidden, applyPhone) {
    const picCount = document.querySelectorAll(".pic-wrapper").length;
    const newId = "img" + picCount.toString();
    const picPanel = document.createElement("div");
    picPanel.classList.add("pic-panel");
    picPanel.setAttribute("id", newId);
    picPanel.setAttribute("data-id", idDB);
    const picOperations = document.createElement("div");
    picOperations.classList.add("pic-operations");
    const deleteButton = document.createElement("button");
    deleteButton.setAttribute("class", "btn btn-danger");
    deleteButton.innerHTML = `<i class="fa fa-times"></i>`;


    const editButton = document.createElement("button");
    editButton.setAttribute("class", "btn btn-primary");
    editButton.innerHTML = `<i class="fa fa-edit"></i>`;

    const rotateLeftButton = document.createElement("button");
    rotateLeftButton.setAttribute("class", "btn btn-primary");
    rotateLeftButton.innerHTML = `<i class="fa fa-rotate-left"></i>`;

    //const downloadButton = document.createElement("button");
    //downloadButton.setAttribute("class", "btn btn-primary");
//    downloadButton.innerHTML = `<i class="fa fa-arrow-down"></i>`;

    const restoreButton = document.createElement("button");
    restoreButton.setAttribute("class", "btn btn-success");
    restoreButton.innerHTML = `<i class="fa fa-mail-reply"></i>`;

    const picWrapper = document.createElement("div");
    picWrapper.classList.add("pic-wrapper");
    const imgEl = document.createElement("img");
    if (imgUrl.indexOf("?") != -1){
        imgEl.src = imgUrl + "&id=" + idDB;
    }else{
        imgEl.src = imgUrl;
    }    

    const leftButton = document.createElement("button");
    leftButton.setAttribute("class", "btn btn-succes");
    leftButton.innerHTML = `<i class="fa fa-arrow-left"></i>`;


    const rightButton = document.createElement("button");
    rightButton.setAttribute("class", "btn btn-succes");
    rightButton.innerHTML = `<i class="fa fa-arrow-right"></i>`;

    const downloadButton = document.createElement("button");
    downloadButton.setAttribute("class", "btn btn-primary");
    downloadButton.innerHTML = `<a href="`+imgEl.src+`" download="bky" target="_blank"><i class="fa fa-arrow-down" style="color:white"></i></a>`;

    const applyPhoneButton = document.createElement("button");
    if(applyPhone){
        applyPhoneButton.setAttribute("class", "btn btn-primary");
    }else{
        applyPhoneButton.setAttribute("class", "btn");
    }
    applyPhoneButton.innerHTML = `<i class="fa fa-phone" id="applyPhoneTarget-${newId}" enabled="${applyPhone ? 'true' : 'false'}"></i>`;


    deleteButton.addEventListener("click", () => {
        var parent = $(imgEl).parents(".pics");
        if (parent.hasClass("persistent")){
            deleteImgButton(newId, idDB, imgEl, editButton); 
        }else{
            removeImgBtn(idDB, imgEl);
        }                
    });
    applyPhoneButton.addEventListener("click", () => {
        var parent = $(imgEl).parents(".pics");
        console.log("PARENT", newId, idDB,)
        if($(`#applyPhoneTarget-${newId}`).attr("enabled") === "true"){
            applyPhoneImg(idDB, false)
        }else{
            applyPhoneImg(idDB, true)
        }      
    });
    editButton.addEventListener("click", () => {
        editImgButton(newId, idDB, imgEl, editButton);
    });

    rotateLeftButton.addEventListener("click", () => {
        rotateLeft(newId, idDB, imgEl, rotateLeftButton);
    });

    restoreButton.addEventListener("click", () => {
        restoreImgButton(newId, idDB, imgEl, editButton);        
    });


    leftButton.addEventListener("click", () =>{
        movePicLeft(newId);
    });

    rightButton.addEventListener("click", () =>{
        movePicRight(newId);
    });

    picPanel.appendChild(picOperations);
    picPanel.appendChild(picWrapper);
    if (!isHidden){
        picOperations.appendChild(leftButton);
    }
    
    picOperations.appendChild(deleteButton);
    picOperations.appendChild(applyPhoneButton);
    picOperations.appendChild(editButton);
    picOperations.appendChild(rotateLeftButton);
    picOperations.appendChild(downloadButton);
    picOperations.appendChild(restoreButton);

    if (!isHidden){
        picOperations.appendChild(rightButton);
    }
    
    
    picWrapper.appendChild(imgEl);
    if (isHidden){
        $(picPanel).attr("id", newId + "removed")
        document.querySelector(".removed").appendChild(picPanel);
    }else{
        document.querySelector(".pics").appendChild(picPanel);
        
        picIds.push(newId);
    }    
};

function insertBefore(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode);
}
function insertAtLastPosition(newNode, existingNode) {
    existingNode.parentNode.appendChild(newNode);
}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextElementSibling);
}

function movePicLeft(picId) {
    console.log("Initial picIds:", picIds);

    var parentElement = document.getElementById(picId).parentElement;
    var picToMove = document.getElementById(picId);

    var picPosition = -1;

    // Find the current position of the image in picIds array
    for (var i = 0; i <= picIds.length; i++) {
        if (picId == picIds[i]) {
            picPosition = i;
            break;
        }
    }
    console.log(`Moving picId ${picId} from position`, picPosition);

    if (picPosition > -1) {
        picToMove.remove();

        if (picPosition == 0) {
            insertAtLastPosition(picToMove, parentElement.lastElementChild);
            picIds.splice(picPosition, 1);
            picIds.push(picId);
            console.log(`Moved picId ${picId} to the last position`);
        } else {
            var moveAfter = document.getElementById(picIds[picPosition - 1]);
            insertBefore(picToMove, moveAfter);
            picIds.splice(picPosition, 1);
            picIds.splice(picPosition - 1, 0, picId);
            console.log(`Moved picId ${picId} to position ${picPosition - 1}`);
        }
    }
    console.log("Updated picIds:", picIds);
}

function movePicRight(picId) {
    console.log("Initial picIds:", picIds);

    var picToMove = document.getElementById(picId);

    var picPosition = -1;

    // Find the current position of the image in picIds array
    for (var i = 0; i <= picIds.length; i++) {
        if (picId == picIds[i]) {
            picPosition = i;
            break;
        }
    }
    console.log(`Moving picId ${picId} from position`, picPosition);

    if (picPosition > -1) {
        picToMove.remove();

        if (picPosition == picIds.length - 1) {
            var moveAfter = document.getElementById(picIds[0]);
            insertBefore(picToMove, moveAfter);
            picIds.splice(picPosition, 1);
            picIds.splice(0, 0, picId);
            console.log(`Moved picId ${picId} to the first position`);
        } else {
            var moveAfter = document.getElementById(picIds[picPosition + 1]);
            insertAfter(picToMove, moveAfter);
            picIds.splice(picPosition, 1);
            picIds.splice(picPosition + 1, 0, picId);
            console.log(`Moved picId ${picId} to position ${picPosition + 1}`);
        }
    }
    console.log("Updated picIds:", picIds);
}


function deleteImgButton(newId, idDB, imgEl, editButton){
    toggleLoader();
        var tmpImg = $("#" + newId).clone();
        tmpImg.attr("id",newId + "removed");
        $(tmpImg).appendTo(".removed");
        tmpImg.find(".pic-operations .btn-danger").on("click", ()=>{
            //deleteImgButton(newId, idDB, imgEl, editButton);
            removeImgBtn(idDB, imgEl);
        });
        tmpImg.find(".pic-operations .btn-primary").on("click", ()=>{editImgButton(newId, idDB, imgEl, editButton)});
        tmpImg.find(".pic-operations .btn-success").on("click", ()=>{restoreImgButton(newId, idDB, imgEl, editButton)});
        fetch("/images/romoveImg", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({ id: idDB})
        }).then((r) => {
            toggleLoader();
            if (r.status !== 200) return alert(
                "⚠ Si è verificato un errore durante il caricamento della foto",
            );
            document.querySelector("#" + newId).remove();
            enablePicsUpdate();
        });   
}

function applyPhoneImg(idDB, value){
    toggleLoader();
        fetch("/images/updateImgPhone", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({ id: idDB, applyPhone: value})
        }).then((r) => {
            toggleLoader();
            if (r.status !== 200) return alert(
                "⚠ Si è verificato un errore durante il caricamento della foto",
            );
            return window.location.reload(false)
        });   
}

function removeImgBtn(id, el){
    toggleLoader();
    fetch("/images/removeDefImg", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: id})
    }).then((r) => {
        toggleLoader();
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento della foto",
        );
        $(el).parents(".pic-panel").remove();
        //document.querySelector("#" + newId + "removed").remove();
        enablePicsUpdate();
    });  
}
function editImgButton2(newId, idDB, imgEl, editButton){
    if (editButton.classList.contains("btn-primary")) {
        editButton.setAttribute("class", "btn btn-warning");
        croppers[newId] = new Cropper(imgEl, {
            viewMode: 3,
            dragMode: "move",
        });
        return;
    };
    const canvas = croppers[newId].getCroppedCanvas();
    croppers[newId].destroy();
    //if (confirm("📷 Sei sicuro di voler ritagliare l'immagine?"))
        canvas.toBlob(b => {
            document.querySelector(`#${newId} img`).src = URL.createObjectURL(b);
            enablePicsUpdate();
        });
    editButton.setAttribute("class", "btan btn-primary");
}

function editImgButton(newId, idDB, imgEl, editButton) {
    if (editButton.classList.contains("btn-primary")) {
        editButton.setAttribute("class", "btn btn-warning");

        if (!imgEl.complete) {
            imgEl.onload = function() {
                initializeCropper(newId, imgEl);
            };
        } else {
            initializeCropper(newId, imgEl);
        }
        return;
    }

    const cropper = croppers[newId];
    if (!cropper) return;

    // Create custom choice modal instead of native confirm
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
const modalContent = document.createElement('div');
modalContent.style.backgroundColor = 'white';
modalContent.style.padding = '20px';
modalContent.style.borderRadius = '5px';
modalContent.style.textAlign = 'center';
modalContent.style.position = 'relative'; // Needed for positioning the close button

const closeButton = document.createElement('span');
closeButton.innerHTML = '&times;';
closeButton.style.position = 'absolute';
closeButton.style.top = '10px';
closeButton.style.right = '15px';
closeButton.style.fontSize = '24px';
closeButton.style.cursor = 'pointer';
closeButton.style.color = '#aaa';
closeButton.onmouseover = () => closeButton.style.color = 'black';
closeButton.onmouseout = () => closeButton.style.color = '#aaa';
closeButton.onclick = () => {
    document.body.removeChild(modal);
};
    
modalContent.innerHTML = `
    <h3>Seleziona un'opzione</h3>
    <p>Cliccando <b>Anteprima</b> l'immagine si salvera' solo per la foto vetrina. 
    <br>! Attenzione tenere il soggetto sempre al centro del riquadro!</p><br>

    <p>Cliccando <b>Salva Foto</b> l'immagine si modifichera' interamente al interno del annuncio.<br> Dopo aver cliccato Salva Foto e' necessario cliccare anche Salva Immagini sotto per salvare. </p>

    <button id="anteprimaBtn" style="margin: 10px; padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 4px;">Anteprima</button>
    <button id="modificaBtn" style="margin: 10px; padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px;">Salva Foto</button>
    <button id="resetAnteprimaBtn" style="margin: 10px; padding: 8px 15px; background: #dc3545; color: white; border: none; border-radius: 4px;">Reset Crop Anteprima</button>
`;
    
    modal.appendChild(modalContent);
    modalContent.appendChild(closeButton);

    document.body.appendChild(modal);

    // Handle button clicks
    document.getElementById('anteprimaBtn').onclick = function() {
        processCrop(true, newId, idDB, imgEl, cropper, editButton);
        document.body.removeChild(modal);
    };
    
    document.getElementById('modificaBtn').onclick = function() {
        processCrop(false, newId, idDB, imgEl, cropper, editButton);
        document.body.removeChild(modal);
    };

    document.getElementById('resetAnteprimaBtn').onclick = function () {
    fetch("/annuncio/resetcropanteprima", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: idDB
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to reset crop anteprima");
        console.log("Anteprima reset successfully");
        location.reload();
    })
    .catch(err => {
        console.error("Error resetting anteprima:", err);
    });

    document.body.removeChild(modal);
};
}

function processCrop(isAnteprima, newId, idDB, imgEl, cropper, editButton) {
    // Get dimensions and scaling factors
    const naturalWidth = imgEl.naturalWidth;
    const naturalHeight = imgEl.naturalHeight;
    const scaleX = naturalWidth / imgEl.width;
    const scaleY = naturalHeight / imgEl.height;

    const canvas = cropper.getCroppedCanvas({
        width: naturalWidth,
        height: naturalHeight
    });

    const data = cropper.getData();
    cropper.destroy();

    // Calculate 60% offset to the LEFT (negative X) and UP (negative Y)
    const offsetX = -data.width * 0.2;
    const offsetY = -data.height * 0.2;
    
    // Apply offsets and scaling with boundary checks
    const cropInfo = {
        x: Math.max(Math.round((data.x + offsetX)), 0),
        y: Math.max(Math.round((data.y + offsetY)), 0),
        dx: Math.round(data.width) * 0.6,
        dy: Math.round(data.height) * 0.6,
    };

    canvas.toBlob(blob => {
        const imgElement = document.querySelector(`#${newId} img`);
        if (imgElement) {
            if (imgElement.src.startsWith('blob:')) {
                URL.revokeObjectURL(imgElement.src);
            }
            imgElement.src = URL.createObjectURL(blob);
            enablePicsUpdate();

            if (isAnteprima) {
                fetch("/annuncio/savecropanteprima", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: idDB,
                        crop: cropInfo
                    })
                })
                .then(res => {
                    if (!res.ok) throw new Error("Failed to save crop");
                    console.log("Anteprima saved successfully");
                })
                .catch(err => {
                    console.error("Error saving anteprima:", err);
                });
            } else {
                console.log("Foto modificata salvata localmente");
            }
        }
    }, 'image/jpeg', 1);

    editButton.setAttribute("class", "btn btn-primary");
}

async function initializeCropper(newId, imgEl, idDB) {
    try {
        // Fetch saved crop data
        const res = await fetch("/annuncio/getcropanteprima", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: idDB })
        });

        const { crop } = res.ok ? await res.json() : { crop: {} };

        croppers[newId] = new Cropper(imgEl, {
            viewMode: 1,
            dragMode: "move",
            aspectRatio: 3 / 4,
            autoCropArea: 1,
            zoomable: false,
            scalable: true,
            movable: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            ready: function () {
                const containerData = this.cropper.getContainerData();

                if (crop && crop.x !== undefined && crop.y !== undefined && crop.dx && crop.dy) {
                    // Apply saved crop dimensions
                    this.cropper.setCropBoxData({
                        left: crop.x,
                        top: crop.y,
                        width: crop.dx,
                        height: crop.dy
                    });
                } else {
                    // Default behavior if no crop saved
                    const cropBoxWidth = containerData.width;
                    const cropBoxHeight = containerData.width * (3 / 4);
                    const initialLeft = Math.max(-containerData.width, 0);
                    const initialTop = Math.max(-containerData.height, 0);

                    this.cropper.setCropBoxData({
                        left: initialLeft,
                        top: initialTop,
                        width: cropBoxWidth,
                        height: cropBoxHeight
                    });
                }
            }
        });

    } catch (err) {
        console.error("Failed to initialize cropper with saved crop:", err);
    }
}

function rotateLeft(newId, idDB, imgEl, rotateButton) {
    if (rotateButton.classList.contains("btn-primary")) {
        rotateButton.setAttribute("class", "btn btn-warning");
        croppers[newId] = new Cropper(imgEl, {
            viewMode: 0,
            dragMode: "none", // Disable cropping
            autoCrop: false,  // Disable automatic crop box
            cropBoxResizable: false, // Disable resizing
            cropBoxMovable: false,   // Disable moving
        });
        return;
    };

    // Rotate the image to the left by 90 degrees
    croppers[newId].rotate(-90); // Negative value for left rotation

    // Optionally, you can get the updated cropped canvas if needed
    const canvas = croppers[newId].getCroppedCanvas();

    // Destroy the cropper after use
    croppers[newId].destroy();

    // Convert the canvas to a Blob and update the image source
    canvas.toBlob(b => {
        document.querySelector(`#${newId} img`).src = URL.createObjectURL(b);
        enablePicsUpdate();
    });

    rotateButton.setAttribute("class", "btn btn-primary");
}

function restoreImgButton(newId, idDB, imgEl, editButton){
    toggleLoader();
        var tmpImg = $("#" + newId + "removed").clone();
        tmpImg.attr("id", newId.replace("removed", ""));
        $(tmpImg).appendTo(".persistent");
        tmpImg.find(".pic-operations .btn-danger").on("click", ()=>{deleteImgButton(newId, idDB, imgEl, editButton)});
        tmpImg.find(".pic-operations .btn-primary").on("click", ()=>{editImgButton(newId, idDB, imgEl, editButton)});
        tmpImg.find(".pic-operations .btn-success").on("click", ()=>{restoreImgButton(newId, idDB, imgEl, editButton)});
        fetch("/images/restoreImg", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({ id: idDB})
        }).then((r) => {
            toggleLoader();
            if (r.status !== 200) return alert(
                "⚠ Si è verificato un errore durante il caricamento della foto",
            );
            document.querySelector("#" + newId + "removed").remove();
            enablePicsUpdate();
        });    
}
function addImageOld(imgUrl) {
    const picCount = document.querySelectorAll(".pic-wrapper").length;
    const newId = "img" + picCount.toString();

    const picPanel = document.createElement("div");
    picPanel.classList.add("pic-panel");
    const picArrows = document.createElement("div");
    picArrows.classList.add("pic-arrows");

    // const leftArrow = document.createElement("button");
    // leftArrow.setAttribute("class", "btn btn-primary");
    // leftArrow.innerHTML = "<b>&lt;</b>";
    // const rightArrow = document.createElement("button");
    // rightArrow.setAttribute("class", "btn btn-primary");
    // rightArrow.setAttribute("disabled", true);
    // rightArrow.innerHTML = "<b>&gt;</b>";
    // picArrows.appendChild(leftArrow);
    // picArrows.appendChild(rightArrow);

    const picWrapper = document.createElement("div");
    picWrapper.classList.add("pic-wrapper");
    const checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("id", newId);
    checkbox.setAttribute("checked", true);
    const editButton = document.createElement("button");
    editButton.setAttribute("class", "btn btn-primary");
    editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="25" height="25" viewBox="0 0 24 24"><path d="M7.127 22.562l-7.127 1.438 1.438-7.128 5.689 5.69zm1.414-1.414l11.228-11.225-5.69-5.692-11.227 11.227 5.689 5.69zm9.768-21.148l-2.816 2.817 5.691 5.691 2.816-2.819-5.691-5.689z"/></svg>`;
    const imgEl = document.createElement("img");
    imgEl.src = imgUrl;

    checkbox.addEventListener("click", () => {
        if (checkbox.checked)
            return checkbox.parentElement.parentElement.removeAttribute("style");
        checkbox.parentElement.parentElement.setAttribute("style", "opacity: 0.5;");
    });

    // if (picCount === 0) {
        // leftArrow.setAttribute("disabled", true);
    // } else {
        // leftArrow.addEventListener("click", () => {
            // const previousImg = document.querySelector(`label[for='img${picCount - 1}'] img`);
            // const currentImg = document.querySelector(`label[for='img${picCount}'] img`);
            // const tempSrc = previousImg.src;
            // previousImg.src = currentImg.src;
            // currentImg.src = tempSrc;
// 
            // // const imgs = images.map(i => i.src);
            // // images.forEach(i => i.cropper.destroy());
            // // images = [];
            // // document.querySelectorAll(".pic-panel").forEach(p => p.remove());
            // // for (let i = 0; i < imgs.length; i++) {
                // // if (i === picCount) {
                    // // addImage(imgs[picCount - 1]);
                    // // continue;
                // // };
                // // if (i === (picCount - 1)) {
                    // // addImage(imgs[picCount]);
                    // // continue;
                // // };
                // // addImage(imgs[i]);
            // // };
        // });
        // const previousImgPanel = document.querySelector(`#img${picCount - 1}`).parentElement.parentElement;
        // const previousRightButton = previousImgPanel.querySelector(".pic-arrows button:last-child");
        // previousRightButton.removeAttribute("disabled");
        // previousRightButton.addEventListener("click", () => {
            // const previousImg = document.querySelector(`label[for='img${picCount - 1}'] img`);
            // const currentImg = document.querySelector(`label[for='img${picCount}'] img`);
            // const tempSrc = previousImg.src;
            // previousImg.src = currentImg.src;
            // currentImg.src = tempSrc;
// 
            // // const imgs = images.map(i => i.src);
            // // images = [];
            // // document.querySelectorAll(".pic-panel").forEach(p => p.remove());
            // // for (let i = 0; i < imgs.length; i++) {
                // // if (i === picCount) {
                    // // addImage(imgs[picCount - 1]);
                    // // continue;
                // // };
                // // if (i === (picCount - 1)) {
                    // // addImage(imgs[picCount]);
                    // // continue;
                // // };
                // // addImage(imgs[i]);
            // // };
        // });
    // }

    picWrapper.appendChild(checkbox);
    picWrapper.appendChild(editButton);
    picWrapper.appendChild(imgEl);
    picPanel.appendChild(picArrows);
    picPanel.appendChild(picWrapper);
    document.querySelector(".pics").appendChild(picPanel);
};

function getSelectedDayPubs(currentDate) {
    let result = [];
    let i = 0;
    ["Free", "10x1", "10x3", "10x7"].forEach(promoType => {
        document.querySelectorAll(`.promo${promoType} .newpost-panel`).forEach(panel => {
            let typeData = {};
            typeData.typeAnnuncio = promoType;
            typeData.typePeriodic = "Top";
            typeData.hasPremium = $(panel).data("premium");
            typeData.hasVideo = $(panel).data("cam");
            typeData.hasHighlight = $(panel).data("highlight");
            typeData.hasEtichetta = $(panel).data("etichetta");
            typeData.city = $(panel).data("city");
            let images = [];
            typeData.id = "";
            if($(panel).data("id")) typeData.id = $(panel).data("id");
            if($(panel).data("relativeID")) typeData.relativeID = $(panel).data("relativeID");
            if($(panel).data("state")) typeData.state = $(panel).data("state");
            typeData.GCRecord = null;
            if($(panel).data("GCRecord")) typeData.GCRecord = $(panel).data("GCRecord");
            if ($(".btnPhoto").hasClass("btn-success")) {
            //     let i = -1;
                panel.querySelectorAll(".post-pic-wrapper").forEach(p => {
                    if (p.querySelector("button").classList.contains("btn-warning")){
                        images.unshift({galleria: $(p).find("input").data("id"), isAnteprima: true});
                        return images;
                    }
                    if (p.querySelector("input").checked){
                        images.push({galleria: $(p).find("input").data("id"), isAnteprima: false});
                        return images;
                    }
                });
            };
            // typeData.push({
                if(currentDate){
                    typeData.data = `${currentDate}T${panel.querySelector("input").value}:00.000Z`;
                }else{
                    typeData.data = `${$("#txtDate").val()}T${panel.querySelector("input").value}:00.000Z`;
                }
            //     images,
            // });
            typeData.images = images;
            if (typeData.id == undefined) return;
            result[i] = typeData;
            i++;
        });
    });
    ["1x1", "1x3", "1x7"].forEach(promoType => {
        document.querySelectorAll(`.promo${promoType} .time-slot`).forEach(timeslot => {
            //if (!timeslot.querySelector("input").checked) return;
            let timeslotData = [];
            timeslot.querySelectorAll(".newpost-panel").forEach(panel => {
                let typeData = {};
                typeData.typeAnnuncio = promoType;
                typeData.typePeriodic = "Top";
                typeData.period = $(panel).parents(".time-slot").find(".flex-checkbox label").text();
                typeData.hasPremium = $(panel).attr("data-premium");
                typeData.hasVideo = $(panel).attr("data-cam");
                typeData.hasHighlight = $(panel).attr("data-highlight");
                typeData.hasEtichetta = $(panel).attr("data-etichetta");
                typeData.city = $(panel).data("city");
                let images = [];
                typeData.id = "";
                if($(panel).data("id")) typeData.id = $(panel).data("id");
                if($(panel).data("relativeID")) typeData.relativeID = $(panel).data("relativeID");
                if($(panel).data("state")) typeData.state = $(panel).data("state");
                typeData.GCRecord = null;
                if($(panel).data("GCRecord")) typeData.GCRecord = $(panel).data("GCRecord");
                if ($(".btnPhoto").hasClass("btn-success")) {
                //     let i = -1;
                    panel.querySelectorAll(".post-pic-wrapper").forEach(p => {
                        if (p.querySelector("button").classList.contains("btn-warning")){
                            images.unshift({galleria: $(p).find("input").data("id"), isAnteprima: true});
                            return images;
                        }
                        if (p.querySelector("input").checked){
                            images.push({galleria: $(p).find("input").data("id"), isAnteprima: false});
                            return images;
                        }
                    });
                };
                // typeData.push({
                    if(currentDate){
                        typeData.data = `${currentDate}T${panel.querySelector("input").value}:00.000Z`;
                    }else{
                        typeData.data = `${$("#txtDate").val()}T${panel.querySelector("input").value}:00.000Z`;
                    }
                //     images,
                // });
                typeData.images = images;
                if (typeData.id == undefined) return;
                result[i] = typeData;
                i++;
            });
            //typeData[timeslot.querySelector("label").innerText] = timeslotData;
        });
        // if (!Object.keys(typeData).length) return;
        // result[i] = typeData;
        // i++;
    });
    // if (document.querySelector("#cam").checked)
    //     result.cam = true;
    // if (document.querySelector("#premium").checked)
    //     result.premium = true;
    // return JSON.stringify(result) === "{}" ? undefined : result;
    return result;
};

document.querySelector("#txtDate").addEventListener("change", () => {
    const currentDayString = new Date().toLocaleDateString("zh-hans-cn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");
    const selectedDay = document.querySelector("#txtDate").value;
    let newDay;
    // if (new Date(selectedDay) < new Date(currentDayString)) {
    //     document.querySelector("#txtDate").value = currentDayString;
    //     newDay = currentDayString;
    //     //alert("🗓 Non è possibile modificare le pubblicazioni dei giorni antecedenti ad oggi.");
    //     ShowAlert("custom", "🗓 Non è possibile modificare le pubblicazioni dei giorni antecedenti ad oggi.");
    // } else {
        newDay = selectedDay;
    //};
    const wasDisabled = document.querySelector("#updateScheduleBtn").getAttribute("disabled");
    pubs[currentDay] = getSelectedDayPubs(currentDay);
    currentDay = newDay;
    loadDay(newDay);
    // document.querySelector("#promoFree").click();
    if (wasDisabled) document.querySelector("#updateScheduleBtn").setAttribute("disabled", true);
});

function loadDay(date) {
    clearPubsViews();
    if (!pubs[date]) return;
    loadDayData(pubs[date]);
};

function clearPubsViews() {
    //document.querySelectorAll(".promoPanel .btn-danger").forEach(b => b.click());
    $(".btn-danger").parents(".time-slot").find(".form-check-input").click();
    $(".newpost-panel").remove();
    //$(".chkCam").prop("checked", false);
    //$(".chkPremium").prop("checked", false);
    // ["videochiamata", "premium"].forEach(s => {
    //     document.querySelector(`.${s}-promo input`).checked = false;
    // });
};

function loadDayData(pubs) {
    // Process Free, 10x1, 10x3, 10x7 promo types (unchanged)
    ["Free", "10x1", "10x3", "10x7"].forEach(promoType => {
        pubs
            .filter(x => !x.GCRecord)
            .filter(x => x.typeAnnuncio === promoType)
            .forEach(announcement => {
                if (announcement.status !== undefined && announcement.status !== "pending") return;

                document.querySelector(`.promo${promoType} .btn-primary`).click();
                const panel = $(`.promo${promoType} .newpost-panel:last-child`);
                panel.attr("data-id", announcement.id);

                announcement.time = announcement.data.split("T")[1].split(":00.")[0];
                panel.find("input").val(announcement.time);

                if (!announcement.images.length) return;

                if (panel.find(".btn-dark").length) {
                    panel.find(".btn-dark").click();
                }

                panel.attr("data-city", announcement.city);
                panel.find("select").val(announcement.city);

                if (promoType !== "Free") {
                    if (announcement.hasPremium) togglePremiumCam(panel.find(".btnPremium"), true);
                    if (announcement.hasVideo) togglePremiumCam(panel.find(".btnCam"), false);
                    if (announcement.hasHighlight) togglePremiumCam(panel.find(".btnHighlight"), false, true);
                    if (announcement.hasEtichetta) togglePremiumCam(panel.find(".btnEtichetta"), false, false, true);

                    panel.attr({
                        "data-premium": announcement.hasPremium,
                        "data-cam": announcement.hasVideo,
                        "data-highlight": announcement.hasHighlight,
                        "data-etichetta": announcement.hasEtichetta
                    });
                }

                processImages(panel, announcement.images);
                panel.attr("data-state", announcement.state);
            });
    });

    // Process 1x1, 1x3, 1x7 promo types with MutationObserver
["1x1", "1x3", "1x7"].forEach(promoType => {
  console.log(`🔄 Processing promoType: ${promoType}`);

  document.querySelectorAll(`.promo${promoType} .time-slot`).forEach((timeslot, slotIndex) => {
    const timeslotLabel = timeslot.querySelector("label").innerText.trim();
    console.log(`⏱️ Timeslot: ${timeslotLabel}`);

    // Get relevant announcements for this promo and time
    const relevantAnnouncements = pubs
      .filter(x => !x.GCRecord)
      .filter(x => x.typeAnnuncio === promoType &&
                   x.period === timeslotLabel &&
                   (x.status === undefined || x.status === "pending"));

    console.log(`📦 Found ${relevantAnnouncements.length} announcements for ${timeslotLabel}`);

    if (relevantAnnouncements.length === 0) return;

    // Step 1: Prepare DOM observers to fill each post after panel is created
    relevantAnnouncements.forEach((announcement, idx) => {
      const observer = new MutationObserver((mutations, obs) => {
        const panels = $(timeslot).find(".newpost-panel");
        if (panels.length > idx) {
          obs.disconnect();
          console.log(`✅ Panel ${idx + 1} ready for ${timeslotLabel}`);
          setupPanel(announcement, timeslot);
        }
      });

      observer.observe(timeslot, {
        childList: true,
        subtree: true
      });
    });

    // Step 2: After all data is loaded and observers are in place, click buttons
    relevantAnnouncements.forEach((_, idx) => {
      setTimeout(() => {
        if (idx === 0) {
          console.log(`🟢 Expanding first slot`);
          timeslot.querySelector("input")?.click(); // Expand timeslot
        } else {
          const addBtn = timeslot.querySelector(".posts > button");
          if (addBtn) {
            console.log(`➕ Clicking "Add Post" for panel ${idx + 1}`);
            addBtn.click();
          } else {
            console.warn("⚠️ Add Post button not found.");
          }
        }
      }, idx * 1000); // 1s delay between each click
    });
  });
});

    // Helper function to set up a panel
    function setupPanel(announcement, timeslot) {
        const panel = $(timeslot).find('.newpost-panel:last-child');
        const time = announcement.data.split("T")[1].split(":00.")[0];
        
        console.log(`⚙️ Configuring panel for ${time}`);

        panel.attr({
            "data-id": announcement.id,
            "data-state": announcement.state,
            "data-city": announcement.city
        });

        panel.find("input").val(time);
        panel.find("select").val(announcement.city);

        // Set premium features
        if (announcement.hasPremium) togglePremiumCam(panel.find(".btnPremium"), true);
        if (announcement.hasVideo) togglePremiumCam(panel.find(".btnCam"), false);
        if (announcement.hasHighlight) togglePremiumCam(panel.find(".btnHighlight"), false, true);
        if (announcement.hasEtichetta) togglePremiumCam(panel.find(".btnEtichetta"), false, false, true);

        panel.attr({
            "data-premium": announcement.hasPremium,
            "data-cam": announcement.hasVideo,
            "data-highlight": announcement.hasHighlight,
            "data-etichetta": announcement.hasEtichetta
        });

        // Process images if they exist
        if (announcement.images.length > 0) {
            panel.find(".btn-dark").click();
            processImages(panel, announcement.images);
        }
    }

    // Helper function to process images
    function processImages(panel, images) {
        panel.find(".post-pics div input").each((i, btn) => {
            const targetID = $(btn).data("id");
            const match = images.find(img => img.galleria == targetID);
            
            if (!match) {
                $(btn).click();
                console.log(`🖼️ Selected image slot: ${targetID}`);
            } else if (match.isAnteprima) {
                $(btn).parents(".post-pic-wrapper").find(".btn-anteprima").click();
                console.log(`⭐ Set anteprima for slot: ${targetID}`);
            }
        });
    }
}

function deletefuture() {
    if (confirm("Sicuro di voler eliminare le pubblicazioni programmate?")){
        Object.keys(pubs).forEach(x => {
            if (new Date(x) > new Date){
                pubs[x].forEach(y =>{
                    y.GCRecord = true;
                    $(`.newpost-panel[data-id="${y.id}"`).data("GCRecord", true);
                    $(`.newpost-panel[data-id="${y.id}"`).attr("data-GCRecord", true);
                    $(`.newpost-panel[data-id="${y.id}"`).css("display", "none");
                });
            }
        });
        $(`.newpost-panel`).each((i, x) =>{
            if (!$(x).attr("data-id")) {
                $(x).data("GCRecord", true);
                $(x).attr("data-GCRecord", true);
                $(x).css("display", "none");
            }
        });
        requestUpdate();
        var newDateSel = null;
        $(".day").each((i, f) =>{
            if(!$(f).hasClass("wrong-month")){
                var d = new Date($(f).data("date"));
                if (d < new Date) {newDateSel = f;}
            }
        });
        newDateSel.click();    
    }
}

function updateSchedule() {
    pubs[currentDay] = getSelectedDayPubs();
    const phone = document.querySelector("input[name='phone']").value;
    requestUpdate(true);
};

function requestUpdate(reload){
    var anID = $("#annuncioID").val();
    toggleLoader();
    fetch("/annuncio/updateSchedule", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
            id: anID,
            schedule: pubs
        }),
    }).then((r) => {
        toggleLoader();
        loadStorico(parseInt(QUERY_NEW));
        if (r.status === 405) return alert(
            "⚠ Assicurati prima di salvare le informazioni dell'annuncio."
        );
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante l'aggiornamento delle pubblicazioni.",
        );
        document.querySelector("#updateScheduleBtn").setAttribute("disabled", true);
        if (reload) window.location.reload();
        r.json().then(async (res) => {
            $(res.schedulato).each((i, x)=>{
                if (x.relativeID){
                    $(`*[data-relativeID="${x.relativeID}"]`).data("id", x.id);
                    $(`*[data-relativeID="${x.relativeID}"]`).attr("data-id", x.id);
                    Object.keys(pubs).forEach(u => {
                        if (new Date(u) > new Date){
                            pubs[u].forEach(y =>{
                                if(y.relativeID == x.relativeID) y.id = x.id;
                            });
                        }
                    });
                }
            });
        });
        ShowAlert("lblSaved");
    });
}

function getImgsFormData() {
    let formData = new FormData();
    return new Promise((resolve, reject) => {
        Promise.all([...document.querySelectorAll(".persistent img")].map(
            (imgEl) => {
                return new Promise((res, rej) => {
                    fetch(imgEl.src).then(response => {
                        var imgID = $(imgEl).parents(".pic-panel").data("id");
                        var hidden = $(imgEl).parents(".pics").hasClass("removed");
                        var isNew = $(imgEl).attr("src").indexOf("blob:") !== -1
                        response.blob().then(blob => res([blob, imgID, hidden, isNew]));
                    }).catch(() => rej());
                })
            })).then(blobs => {
            blobs.forEach(file => {
                formData.append("imgs", file[0]);
                formData.append("origin", file[1]);
                formData.append("hidden", file[2]);
                formData.append("isNew", file[3]);
            });
            resolve(formData);
        }).catch(() => reject());
    });
};

function updateImages() {
    toggleLoader();
    const phone = document.querySelector("input[name='phone']").value;
    getImgsFormData().then(formData => {
        updateImg(formData, phone);
    });
};

function updateImg(formData, phone){
    fetch(`/images/update?phone=${phone}&ann=${QUERY_NEW}`, {
        method: "POST",
        body: formData,
    }).then(res => {
        if (res.status !== 201) return alert("❌ Si è verificato un errore durante l'aggiornamento delle immagini.");
        document.querySelector("#updatePicsBtn").setAttribute("disabled", true);
        //alert("🖼 Immagini aggiornate correttamente.");
        ShowAlert("lblSaved");
        setTimeout(() => {
            location.reload();
        }, 300);
    });
}

const loadImage = event => {
    var files = event.target || event;
    for(i = 0; i < files.files.length; i++){
        if(files.files[i].size < 10485761){
            let imgData ={
                src: URL.createObjectURL(files.files[i]),
                origin: files.files[i].name,
                donna: $("#donnaID").val()
            }
            enablePicsUpdate();
            //Salva uri su DB
            fetch("/images/addImg", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify({ ...imgData})
            }).then((r) => {
                if (r.status !== 200) return alert(
                    "⚠ Si è verificato un errore durante il caricamento della foto",
                );
                r.json().then(async (res) => {
                    addImage(res.src, res.id, res.isHidden);
                    document.querySelector("input[type='file']").value = "";
                });
            });
        }else{
            ShowAlert("custom", "Il file è troppo grande, è maggiore di 10Mb");
        }
    }
};

$(".btnCopy").on("click", ()=>{
    var text = $("#txtCopy");
    text.val("");

    $(".rptItemStorico:gt(0)").each((i, x)=>{
        //if(i < 20)
        $(text).val($(text).val() + $(x).find("div.col-md-6.col-sm-6").text().trim() + "\n");
    });

    text.focus();
    text[0].select();
    text[0].setSelectionRange(0, 99999);
    navigator.clipboard.writeText($(text).val());
    
    ShowAlert("lblCopied");
});

function copyStorico(btn, id){
    var text = $("#txtCopy");
    text.val("");

    $(`.rptItemStorico[data-id='${id}']`).each((i, x)=>{
        $(text).val($(text).val() + $(x).find("div.col-md-6.col-sm-6").text().trim() + "\n");
    });

    text.focus();
    text[0].select();
    text[0].setSelectionRange(0, 99999);
    navigator.clipboard.writeText($(text).val());
    ShowAlert("lblCopied");
}

const enableInfoUpdate = () => document.querySelector("#updateInfoBtn").removeAttribute("disabled");
const enablePicsUpdate = () => document.querySelector("#updatePicsBtn").removeAttribute("disabled");
const enableScheduleUpdate = () => document.querySelector("#updateScheduleBtn").removeAttribute("disabled");

$("#btnShowImg").on("click", ()=>{
    if($(".removed").is(":visible")){
        $(".persistent").css("display", "flex").fadeIn();
        $(".removed").hide();
    }else{
        $(".removed").css("display", "flex").fadeIn();
        $(".persistent").hide();
    }
});

$(".chkPremium").on("click",(me)=>{
    if($(me.target).parents(".promoPanel").hasClass("premium-promo")){
        $(me.target).parents(".promoPanel").removeClass("premium-promo");
    }else{
        $(me.target).parents(".promoPanel").addClass("premium-promo");
    }
});

$(".chkCam").on("click",(me)=>{
    if($(me.target).parents(".promoPanel").hasClass("videochiamata-promo")){
        $(me.target).parents(".promoPanel").removeClass("videochiamata-promo");
    }else{
        $(me.target).parents(".promoPanel").addClass("videochiamata-promo");
    }
});

var startEditPost = () =>{
    $(".widget-annuncio .form-control, .widget-annuncio .form-check-input").prop('disabled', false);
    //$(".form-control[name='city']").prop('disabled', true);
    $(".servizi-box input").prop('disabled', false);
    $("#updateInfoBtn").prop('disabled', false);
    //$("#btnUpdateSchedul").show();
}

var UpdateSchedulazioni = () =>{
    $(".widget-annuncio .form-control, .widget-annuncio .form-check-input").prop('disabled', true);
    $("#updateInfoBtn").prop('disabled', true);
    //$("#btnUpdateSchedul").hide();
    var anID = $("#annuncioID").val();
    toggleLoader();
    fetch("/annuncio/updateAllDataSchedule", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ info: getInfoData() , id: anID })
    }).then((r) => {
        toggleLoader();
        loadStorico(parseInt(QUERY_NEW));
        if (r.status === 405) return alert(
            "⚠ Assicurati prima di salvare le informazioni dell'annuncio."
        );
        if (r.status !== 201) return alert(
            "⚠ Si è verificato un errore durante l'aggiornamento delle pubblicazioni.",
        );
        ShowAlert("lblSaved");
        setTimeout(() => {
            location.reload();
        }, 300);
    });
}

// var UpdateSchedulazione = (scheduledID) =>{
//     var anID = $("#annuncioID").val();
//     toggleLoader();
//     fetch("/annuncio/updateDataSchedule", {
//         method: "POST",
//         mode: "cors",
//         cache: "no-cache",
//         credentials: "same-origin",
//         headers: {
//             "Content-Type": "application/json",
//         },
//         redirect: "follow",
//         referrerPolicy: "no-referrer",
//         body: JSON.stringify({ sID: scheduledID, id: anID })
//     }).then((r) => {
//         toggleLoader();
//         loadStorico(parseInt(QUERY_NEW));
//         if (r.status === 405) return alert(
//             "⚠ Assicurati prima di salvare le informazioni dell'annuncio."
//         );
//         if (r.status !== 201) return alert(
//             "⚠ Non'è stato trovato un ID per la pubblicazione selezionata, questo problema è noto quando la schedulazione non'è andata a buon fine, oppure non ancora pubblicata."
//         );
//         ShowAlert("lblSaved");
//     });
// }
$(".form-control[name='phone']").keyup(()=>{
    stopPhoneLoading();
});

function btnCloneDay() {
    //currentDay  
    var targetDay = document.querySelector("#txtDateClona").value;

    pubs[currentDay] = getSelectedDayPubs();
    pubs[targetDay] = getSelectedDayPubs();

    for (x of pubs[targetDay]){
        tmpID++;
        x.id = "";
        x.data = x.data.replace(currentDay, targetDay);
        if(new Date(x.data) < new Date()){
            if (!confirm("Attenzione, una schedulazione clonata, risulta già scaduta, vuoi procedere con la clonazione?")){
                x.GCRecord = true;
            }
        }
        x.relativeID = tmpID;        
    }
    //requestUpdate(true);
    ShowAlert("custom", "Pubblicazioni clonate, per salvare le modifiche, cliccare su 'PUBBLICA/MODIFICA TUTTI I TOP'");
    enableScheduleUpdate();
}

function btnCloneProgram() {

    pubs[currentDay] = getSelectedDayPubs();
    var newPubs = getSelectedDayPubs();

    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "Free"), 1);
    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "1x1"), 2);
    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "1x3"), 4);
    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "1x7"), 8);
    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "10x1"), 2);
    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "10x3"), 4);
    clonePubsData(newPubs.filter( x => x.typeAnnuncio == "10x7"), 8);

    
    requestUpdate(true);
    ShowAlert("lblSaved");

}

function clonePubsData(typeAnn, skipDay){
    var targetDay;
    var from = new Date(document.querySelector("#txtDateClonaFrom").value);
    var to = new Date(document.querySelector("#txtDateClonaTo").value);
    var targetDate = new Date(from);
    targetDate.setDate(targetDate.getDate() + skipDay);
    while(targetDate <= to){
        targetDay = targetDate.toLocaleDateString("zh-hans-cn", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).replace(/\//g, "-");
        if (!pubs[targetDay]) pubs[targetDay] = [];
        for(y of typeAnn){
            tmpID++;
            var u = copyPub(y);
            u.data = y.data.replace(currentDay, targetDay);
            u.id = "";
            u.relativeID = tmpID;

            if(new Date(u.data) < new Date()){
                if (confirm("Attenzione, una schedulazione clonata, risulta già scaduta, vuoi procedere con la pubblicazione?")){
                    pubs[targetDay].push(u);
                }
            }else{
                pubs[targetDay].push(u);
            }
        }
        targetDate.setDate(targetDate.getDate() + skipDay);
    };
}

function copyPub(source){
    var u = {};
    u.typeAnnuncio = y.typeAnnuncio;
    u.GCRecord = y.GCRecord;
    u.data = y.data;
    u.hasPremium = y.hasPremium;
    u.hasVideo = y.hasVideo;
    u.hasHighlight = y.hasHighlight;
    u.hasEtichetta = y.hasEtichetta;
    u.id = y.id;
    u.relativeID = y.relativeID;
    u.typePeriodic = y.typePeriodic;
    u.images = y.images;
    u.period = y.period;
    u.city = y.city;
    return u;
}

function suspendAds(e, ids){
    if(confirm("Sicuro di voler procedere con la sospensione? ATTENZIONE: l'annuncio verrà sospeso anche se risultasse a pagamento.")){+
        $(e).attr("onclick", "void(0)");
        $(e).text("In Sospensione..");
        $(e).removeClass("btn-danger");
        $(e).addClass("btn-warning");
        toggleLoader();
        fetch("/annuncio/suspend", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({
                id: ids
            }),
        }).then((r) => {
            toggleLoader();
        });
    }
}
var showSus = false;
function toggleSuspended(){
    let anID = parseInt(QUERY_NEW);
    if (!showSus){
        requestStorico(anID, true);
        $("#btnShowSuspended").html("<b>NASCONDI SOSPESI</b>");
        $(".lblTitleStorico").show();
    }else{
        $(".suspendedStorico").remove();
        $("#btnShowSuspended").html("<b>MOSTRA SOSPESI</b>");
        $(".lblTitleStorico").hide();
    }
    showSus = !showSus;
}

function addRptStoricoSus(sxhedule){
    $(".rptNoData").hide();
    var root = $("#rptStoricoSospesi");
    var row = $(root).find(".rptItemStoricoSospesi").first();
    var newRow = row.clone().removeAttr("style");
    newRow.addClass("suspendedStorico");

    newRow.attr("data-id", sxhedule.id);
    newRow.data("id", sxhedule.id);
    
    var text = `[TOP ${sxhedule.typeAnnuncio}] del ${sxhedule.data.split("T")[0]} alle ${sxhedule.data.split("T")[1].split(":00.")[0]}`;
    newRow.html(newRow.html().replace(/@id@/g, sxhedule.id));
    newRow.html(newRow.html().replace(/@descrizione@/g, text));
    newRow.html(newRow.html().replace(/@città@/g, (sxhedule.city || "Non presente")));
    //<p class="fa fa-clock"> @orari@</p>
    if(sxhedule.dateTimeTop){
        var out = "";
        var oPub = sxhedule.dateTimeTop.split(" - ");
        for (oP of oPub){
            out = out + `<p class="fa fa-clock"> ${oP.replace(/ ,/g, ", ").replace(/,/g, ", ")}</p> `;
        }
        newRow.html(newRow.html().replace(/@orari@/g, out));
    }else{
        newRow.find(".dateTimeTop").remove();
    }
    newRow.html(newRow.html().replace(/@stato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
    switch(sxhedule.payed){
        case true:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
            break;
        default:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-times text-danger'><i></i></h3>"));
    }

    newRow.appendTo(root);
}

function suspendOldAdsAuto() {
    const anID = parseInt(QUERY_NEW, 10);
    console.log("[suspendOldAds] Called with QUERY_NEW =", QUERY_NEW, "parsed anID =", anID);

    fetch("/annuncio/suspendAll", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
            annuncio: anID
        }),
    })
        .then((response) => {
            console.log("[suspendOldAds] Fetch response status:", response.status);
            if (!response.ok) {
                console.error("[suspendOldAds] Request failed:", response.status, response.statusText);
            }
            return response.text(); // or .json() if your API returns JSON
        })
        .then((data) => {
            console.log("[suspendOldAds] Response body:", data);
        })
        .catch((error) => {
            console.error("[suspendOldAds] Fetch error:", error);
        });
}

//document.addEventListener("DOMContentLoaded", suspendOldAdsAuto);

function suspendOldAds(e){
    let anID = parseInt(QUERY_NEW);
    if(confirm("Sicuro di voler procedere con la sospensione? ATTENZIONE: gli annunci verranno sospesi anche se risultassero a pagamento.")){+
        $(e).attr("onclick", "void(0)");
        $(e).html("<b>In Sospensione..</b>");
        $(e).removeClass("btn-danger");
        $(e).addClass("btn-warning");
        toggleLoader();
        fetch("/annuncio/suspendAll", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({
                annuncio: anID
            }),
        }).then((r) => {
            toggleLoader();
            $(e).removeClass("btn-warning");
            $(e).addClass("btn-danger");
            $(e).attr("disabled", true);
            $(e).html("<b>SOSPENDI SCADUTI</b>");
        });
    }
}

var dropCities = (selected)=>{
    var dropBox = document.createElement("select");
    var optionsStr = [
    {value: "Agrigento", text: "Agrigento"},
    {value: "Alessandria", text: "Alessandria"},
    {value: "Ancona", text: "Ancona"},
    {value: "Aosta", text: "Aosta"},
    {value: "Arezzo", text: "Arezzo"},
    {value: "Ascoli", text: "Ascoli"},
    {value: "Asti", text: "Asti"},
    {value: "Avellino", text: "Avellino"},
    {value: "Bari", text: "Bari"},
    {value: "Barletta", text: "Barletta"},
    {value: "Belluno", text: "Belluno"},
    {value: "Benevento", text: "Benevento"},
    {value: "Bergamo", text: "Bergamo"},
    {value: "Biella", text: "Biella"},
    {value: "Bologna", text: "Bologna"},
    {value: "Bolzano", text: "Bolzano"},
    {value: "Brescia", text: "Brescia"},
    {value: "Brindisi", text: "Brindisi"},
    {value: "Cagliari", text: "Cagliari"},
    {value: "Caltanissetta", text: "Caltanissetta"},
    {value: "Campobasso", text: "Campobasso"},
    {value: "Carbonia Iglesias", text: "Carbonia Iglesias"},
    {value: "Caserta", text: "Caserta"},
    {value: "Catania", text: "Catania"},
    {value: "Catanzaro", text: "Catanzaro"},
    {value: "Chieti", text: "Chieti"},
    {value: "Como", text: "Como"},
    {value: "Cosenza", text: "Cosenza"},
    {value: "Cremona", text: "Cremona"},
    {value: "Crotone", text: "Crotone"},
    {value: "Cuneo", text: "Cuneo"},
    {value: "Enna", text: "Enna"},
    {value: "Fermo", text: "Fermo"},
    {value: "Ferrara", text: "Ferrara"},
    {value: "Firenze", text: "Firenze"},
    {value: "Foggia", text: "Foggia"},
    {value: "Forlì", text: "Forlì"},
    {value: "Frosinone", text: "Frosinone"},
    {value: "Genova", text: "Genova"},
    {value: "Gorizia", text: "Gorizia"},
    {value: "Grosseto", text: "Grosseto"},
    {value: "Imperia", text: "Imperia"},
    {value: "Isernia", text: "Isernia"},
    {value: "L'Aquila", text: "L'Aquila"},
    {value: "La Spezia", text: "La Spezia"},
    {value: "Latina", text: "Latina"},
    {value: "Lecce", text: "Lecce"},
    {value: "Lecco", text: "Lecco"},
    {value: "Livorno", text: "Livorno"},
    {value: "Lodi", text: "Lodi"},
    {value: "Lucca", text: "Lucca"},
    {value: "Macerata", text: "Macerata"},
    {value: "Mantova", text: "Mantova"},
    {value: "Massa Carrara", text: "Massa Carrara"},
    {value: "Matera", text: "Matera"},
    {value: "Medio Campidano", text: "Medio Campidano"},
    {value: "Messina", text: "Messina"},
    {value: "Milano", text: "Milano"},
    {value: "Modena", text: "Modena"},
    {value: "Monza", text: "Monza"},
    {value: "Napoli", text: "Napoli"},
    {value: "Novara", text: "Novara"},
    {value: "Nuoro", text: "Nuoro"},
    {value: "Ogliastra", text: "Ogliastra"},
    {value: "Olbia Tempio", text: "Olbia Tempio"},
    {value: "Oristano", text: "Oristano"},
    {value: "Padova", text: "Padova"},
    {value: "Palermo", text: "Palermo"},
    {value: "Parma", text: "Parma"},
    {value: "Pavia", text: "Pavia"},
    {value: "Perugia", text: "Perugia"},
    {value: "Pescara", text: "Pescara"},
    {value: "Piacenza", text: "Piacenza"},
    {value: "Pisa", text: "Pisa"},
    {value: "Pistoia", text: "Pistoia"},
    {value: "Pordenone", text: "Pordenone"},
    {value: "Potenza", text: "Potenza"},
    {value: "Prato", text: "Prato"},
    {value: "Ragusa", text: "Ragusa"},
    {value: "Ravenna", text: "Ravenna"},
    {value: "Reggio Calabria", text: "Reggio Calabria"},
    {value: "R. Emilia", text: "R. Emilia"},
    {value: "Rieti", text: "Rieti"},
    {value: "Rimini", text: "Rimini"},
    {value: "Roma", text: "Roma"},
    {value: "Rovigo", text: "Rovigo"},
    {value: "Salerno", text: "Salerno"},
    {value: "Sassari", text: "Sassari"},
    {value: "Savona", text: "Savona"},
    {value: "Siena", text: "Siena"},
    {value: "Siracusa", text: "Siracusa"},
    {value: "Sondrio", text: "Sondrio"},
    {value: "Taranto", text: "Taranto"},
    {value: "Teramo", text: "Teramo"},
    {value: "Terni", text: "Terni"},
    {value: "Torino", text: "Torino"},
    {value: "Trapani", text: "Trapani"},
    {value: "Trento", text: "Trento"},
    {value: "Treviso", text: "Treviso"},
    {value: "Trieste", text: "Trieste"},
    {value: "Udine", text: "Udine"},
    {value: "Urbino", text: "Urbino"},
    {value: "Varese", text: "Varese"},
    {value: "Venezia", text: "Venezia"},
    {value: "Verbania", text: "Verbania"},
    {value: "Vercelli", text: "Vercelli"},
    {value: "Verona", text: "Verona"},
    {value: "Vibo Valentia", text: "Vibo Valentia"},
    {value: "Vicenza", text: "Vicenza"},
    {value: "Viterbo", text: "Viterbo"}];

    optionsStr.forEach((x)=>{
        var option = document.createElement("option");
        option.value = x.value;
        option.textContent = x.text;
        if (selected == x.value){
            option.selected = true;
        }
        dropBox.appendChild(option);
    });
    return dropBox;
}