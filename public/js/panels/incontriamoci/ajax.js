const validateIncontriamociDescription = (description) => {
    const normalizedDescription = `${description || ""}`.replace(/\s+/g, " ").trim();
    if (normalizedDescription.length >= 50) return true;
    ShowAlert("custom", `La descrizione deve contenere almeno 50 caratteri. Caratteri attuali: ${normalizedDescription.length}.`);
    const descriptionField = document.querySelector("textarea[name='description']");
    if (descriptionField) descriptionField.focus();
    return false;
};

// Update Info(title, Description etc) When Save button
function updateInfo(save) {
    var dataAnnuncio = getInfoData();
    console.log("1", { dataAnnuncio })
    if (!validateIncontriamociDescription(dataAnnuncio.description)) return false;
    var phoneNumber = parseInt(dataAnnuncio.phone, 10);
    if (!phoneNumber || dataAnnuncio.phone.indexOf(" ") != -1 || dataAnnuncio.phone.indexOf("/") != -1 || dataAnnuncio.phone.indexOf(".") != -1 || dataAnnuncio.phone.indexOf(",") != -1) {
        ShowAlert("custom", "Verifica il numero di telefono inserito.");
        return false;
    }

    let anID = 0;
    if (QUERY_NEW) {
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
        body: JSON.stringify({ info: dataAnnuncio, panel: PANEL_PLATFORM, id: anID }),
    }).then((r) => {
        toggleLoader();
        console.log(r.status, 'status')
        if (r.status === 422) {
            return r.json().then((payload) => ShowAlert("custom", payload.error || "La descrizione è troppo corta."));
        }
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
            var link = "/annuncio.html?edit=" + res.id;
            if (QUERY_PANEL) {
                link = link + '&panel=' + PANEL_PLATFORM

            }
            window.location.href = link;
        });
    }).catch((error) => {
        toggleLoader();
        console.error("incontriamoci updateInfo failed:", error);
        alert("âš  Si Ã¨ verificato un errore durante il salvataggio delle informazioni.");
    });
};

function UpdateSchedulazioni() {
    var dataAnnuncio = getInfoData();
    if (!validateIncontriamociDescription(dataAnnuncio.description)) return false;
    var phoneNumber = parseInt(dataAnnuncio.phone, 10);
    if (!phoneNumber || dataAnnuncio.phone.indexOf(" ") != -1 || dataAnnuncio.phone.indexOf("/") != -1 || dataAnnuncio.phone.indexOf(".") != -1 || dataAnnuncio.phone.indexOf(",") != -1) {
        ShowAlert("custom", "Verifica il numero di telefono inserito.");
        return false;
    }

    let anID = 0;
    if (QUERY_NEW) {
        anID = parseInt(QUERY_NEW);
    }

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
        body: JSON.stringify({ info: dataAnnuncio, panel: PANEL_PLATFORM, id: anID }),
    }).then((r) => {
        toggleLoader();
        if (r.status == 401) {
            window.location.href = "/";
            return;
        }
        if (r.status !== 200 && r.status !== 201) return alert(
            "Si e verificato un errore durante la modifica di tutti gli annunci.",
        );

        document.querySelector("#btnUpdateAnnuncio").setAttribute("disabled", true);
        ShowAlert("lblSaved");
        window.location.reload();
    });
};

// requestUpdate Schedule
function requestUpdate(reload) {
    const description = document.querySelector("textarea[name='description']")?.value || "";
    if (!validateIncontriamociDescription(description)) return false;
    var anID = $("#annuncioID").val();
    if (!anID || anID === "new" || Number.isNaN(parseInt(anID, 10))) {
        return alert("Assicurati prima di salvare le informazioni dell'annuncio.");
    }
    console.log(QUERY_PANEL, pubs, 'reqestUpdate Schedule');

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
            panel: PANEL_PLATFORM,
            schedule: pubs
        }),
    }).then((r) => {
        toggleLoader();
        // loadStorico(parseInt(QUERY_NEW));
        if (r.status === 422) {
            return r.json().then((payload) => ShowAlert("custom", payload.error || "La descrizione è troppo corta."));
        }
        if (r.status === 405) return alert(
            "⚠ Assicurati prima di salvare le informazioni dell'annuncio."
        );
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante l'aggiornamento delle pubblicazioni.",
        );

        document.querySelector("#updateScheduleBtn").setAttribute("disabled", true);
        if (reload) {
            const reloadUrl = new URL(window.location.href);
            if (currentDay) reloadUrl.searchParams.set("day", currentDay);
            window.location.href = reloadUrl.toString();
            return;
        }
        r.json().then(async (res) => {
            $(res.schedulato).each((i, x) => {
                if (x.relativeID) {
                    $(`*[data-relativeID="${x.relativeID}"]`).data("id", x.id);
                    $(`*[data-relativeID="${x.relativeID}"]`).attr("data-id", x.id);
                    Object.keys(pubs).forEach(u => {
                        if (new Date(u) > new Date) {
                            pubs[u].forEach(y => {
                                if (y.relativeID == x.relativeID) y.id = x.id;
                            });
                        }
                    });
                }
            });
        });
        ShowAlert("lblSaved");
    });
}
