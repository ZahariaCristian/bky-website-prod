const dateInput = document.querySelector("input[type='date']");
const DAY = new URLSearchParams(window.location.search).get("day");
if (DAY) 
    dateInput.value = DAY;
else
    dateInput.value = new Date().toLocaleDateString("zh-hans-cn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

dateInput.addEventListener("change", () => {
    window.location.href = "/deadline.html?day=" + dateInput.value;
});
$("#chkGroup").on("change",()=>{
    $(".rptItemDeadLines:gt(0)").remove();
    if($("#chkGroup").prop('checked')){
        loadList();
    }else{
        loadListAll();
    }
})

setTimeout(() => {
    loadList();
}, 100);

function loadListAll(){
    fetch("/deadline/getAll", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ day: dateInput.value }),
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento degli annunci.");
        }
        
        r.json().then(async (res) => {
            res.forEach( data =>{
                loadAnnunci(data);
            });
        });
    });
}

function loadList(){
    fetch("/deadline/get", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ day: dateInput.value }),
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento degli annunci.");
        }
        
        r.json().then(async (res) => {
            console.log("Response from /deadline/get:", res); // <-- Add this line
            res.forEach(data => {
                loadAnnunci(data);
            });
        });
    });
}

var loadAnnunci = (data) => {
    $("#rptDeadLines .rptNoData").hide();
    var root = $("#rptDeadLines");
    var row = $(root).find(".rptItemDeadLines").first();
    var newRow = row.clone().removeAttr("style");

    $(newRow).find('*[fieldName="typeAnnuncio"]').text(data.typeAnnuncio);
    $(newRow).find('*[fieldName="tblAnnunci.title"]').attr("href", `/annuncio.html?edit=${data.tblAnnunci.id}`);
    $(newRow).find('*[fieldName="tblAnnunci.title"]').text(data.tblAnnunci.title.length < 75 ? data.tblAnnunci.title : data.tblAnnunci.title.substr(0, 75) + "..");
    $(newRow).find('*[fieldName="tblAnnunci.tblDonne.id"]').attr("href", `/addbook.html?c=${data.tblAnnunci.tblDonne.id}`);
    $(newRow).find('*[fieldName="tblAnnunci.tblDonne.id"]').text(data.tblAnnunci.tblDonne.name.length < 12 ? data.tblAnnunci.tblDonne.name : data.tblAnnunci.tblDonne.name.substr(0, 12) + ".");
    $(newRow).find('*[fieldName="city"]').text(data.tblAnnunci.city);
    $(newRow).html($(newRow).html().replace(/@phone@/g, data.tblAnnunci.tblDonne.phone));

    // Add notified status (add a span or badge in your HTML template with fieldName="notified")
    console.log(data.notified);
    let notifiedText = data.notified ? "✅ Inviato" : "❌ Non inviato";
    $(newRow).find('*[fieldName="notified"]').text(notifiedText);

    newRow.appendTo(root);

    // --- Toggle notifyEnabled button setup ---
    let notifyEnabled = data.notifyEnabled ? true : false;
    let $toggleBtn = $(newRow).find('.btn-toggle-notify');
    $toggleBtn.text(notifyEnabled ? "🔔 Attivo" : "🔕 Disattivo");
    $toggleBtn.toggleClass('btn-success', notifyEnabled);
    $toggleBtn.toggleClass('btn-secondary', !notifyEnabled);
    $toggleBtn.data('schedulazione-id', data.id);
    $toggleBtn.data('notify-enabled', notifyEnabled);
    // --- End toggle setup ---

    // --- Expires At datetime setup ---
    let $expiresAtInput = $(newRow).find('.expiresAt-input');
    let $saveExpiresAtBtn = $(newRow).find('.btn-save-expiresAt');

    // Set initial value if present
    if (data.expiresAt) {
        // Convert string or timestamp to yyyy-MM-ddTHH:mm for input
        let dt = new Date(Number(data.expiresAt) || data.expiresAt);
        if (!isNaN(dt.getTime())) {
            $expiresAtInput.val(dt.toISOString().slice(0,16));
        }
    }

    // Save button handler
    $saveExpiresAtBtn.off('click').on('click', function() {
        let val = $expiresAtInput.val();
        if (!val) return alert('Seleziona data e ora');
        let unixTs = Math.floor(new Date(val).getTime());
        let schedulazioneId = data.id;
        fetch('/deadline/setExpiresAt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ schedulazioneId, expiresAt: unixTs.toString() })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Scadenza aggiornata!');
            } else {
                alert('Errore nel salvataggio della scadenza.');
            }
        })
        .catch(() => alert('Errore di rete.'));
    });
}

function getWhatsappMessage() {
    fetch("/deadline/getWhatsappMessage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "same-origin"
    })
    .then(response => response.json())
    .then(data => {
        if (data.message !== undefined) {
            document.getElementById("expiredMessageInput").value = data.message;
        }
    })
    .catch(() => {
        document.getElementById("expiredMessageStatus").textContent = "Errore nel caricamento del messaggio.";
    });
}


// Function to set the WhatsApp expired message from the input box
function setWhatsappMessage() {
    const message = document.getElementById("expiredMessageInput").value;
    fetch("/deadline/setWhatsappMessage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById("expiredMessageStatus").textContent = "Messaggio salvato!";
        } else {
            document.getElementById("expiredMessageStatus").textContent = "Errore nel salvataggio.";
        }
    })
    .catch(() => {
        document.getElementById("expiredMessageStatus").textContent = "Errore di rete nel salvataggio.";
    });
}

// Call getWhatsappMessage when the page loads
document.addEventListener("DOMContentLoaded", function() {
    getWhatsappMessage();
    loadWhatsappLogs();
    document.getElementById("saveExpiredMessageBtn").addEventListener("click", setWhatsappMessage);
});

function loadWhatsappLogs() {
    fetch("/deadline/getWhatsappLogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
        // No body needed, username is determined server-side from session
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && Array.isArray(data.logs)) {
            renderWhatsappLogsTable(data.logs);
        } else {
            document.getElementById("whatsappLogsTableBody").innerHTML = "<tr><td colspan='5'>Nessun log trovato.</td></tr>";
        }
    })
    .catch(() => {
        document.getElementById("whatsappLogsTableBody").innerHTML = "<tr><td colspan='5'>Errore nel caricamento dei log.</td></tr>";
    });
}

function renderWhatsappLogsTable(logs) {
    const tbody = document.getElementById("whatsappLogsTableBody");
    tbody.innerHTML = "";
    logs.forEach(log => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${log.sent_at ? new Date(log.sent_at).toLocaleString() : ""}</td>
            <td>${log.username || ""}</td>
            <td>${log.phone || ""}</td>
            <td>${log.message ? log.message.replace(/\n/g, "<br>") : ""}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Add this after your function definitions, e.g. at the end of the file or after DOMContentLoaded
$('#rptDeadLines').on('click', '.btn-toggle-notify', function() {
    const btn = $(this);
    const schedulazioneId = btn.data('schedulazione-id');
    fetch('/deadline/toggleNotifyEnabled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ schedulazioneId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            btn.text(data.notifyEnabled ? "🔔 Attivo" : "🔕 Disattivo");
            btn.toggleClass('btn-success', data.notifyEnabled);
            btn.toggleClass('btn-secondary', !data.notifyEnabled);
            btn.data('notify-enabled', data.notifyEnabled);
        } else {
            alert('Errore nel cambiare lo stato di notifica.');
        }
    })
    .catch(() => alert('Errore di rete.'));
});