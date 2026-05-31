var loadStorico = (annuncio) => {
    requestStorico(annuncio, false);
};

var showSus = false;
function toggleSuspended() {
    let anID = parseInt(QUERY_NEW);
    if (!showSus) {
        requestStorico(anID, true);
        $("#btnShowSuspended").html("<b>NASCONDI SOSPESI</b>");
        $(".lblTitleStorico").show();
    } else {
        $(".suspendedStorico").remove();
        $("#btnShowSuspended").html("<b>MOSTRA SOSPESI</b>");
        $(".lblTitleStorico").hide();
    }
    showSus = !showSus;
}

function suspendOldAds(e) {
    let anID = parseInt(QUERY_NEW);
    if (confirm("Sicuro di voler procedere con la sospensione? ATTENZIONE: gli annunci verranno sospesi anche se risultassero a pagamento.")) {
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
                annuncio: anID,
                panel: QUERY_PANEL
            }),
        }).then(() => {
            toggleLoader();
            $(e).removeClass("btn-warning");
            $(e).addClass("btn-danger");
            $(e).attr("disabled", true);
            $(e).html("<b>SOSPENDI SCADUTI</b>");
        });
    }
}

function updateAllPublishedAdsState(e, options) {
    let anID = parseInt(QUERY_NEW);
    if (!confirm(options.confirmText)) {
        return;
    }

    $(e).attr("onclick", "void(0)");
    $(e).html(`<b>${options.pendingText}</b>`);
    $(e).removeClass(options.idleClass);
    $(e).addClass("btn-warning");
    toggleLoader();

    fetch(options.endpoint, {
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
            annuncio: anID,
            panel: QUERY_PANEL
        }),
    }).then((r) => {
        toggleLoader();
        if (r.status == 401) {
            window.location.href = "/";
            return;
        }
        if (r.status !== 200) {
            $(e).attr("onclick", options.onclick);
            $(e).html(`<b>${options.defaultText}</b>`);
            $(e).removeClass("btn-warning");
            $(e).addClass(options.idleClass);
            return alert(options.errorText);
        }

        $(e).removeClass("btn-warning");
        $(e).addClass(options.idleClass);
        $(e).attr("disabled", true);
        $(e).html(`<b>${options.defaultText}</b>`);
        setTimeout(() => {
            location.reload();
        }, 300);
    });
}

function suspendPublishedAds(e) {
    updateAllPublishedAdsState(e, {
        confirmText: "Sicuro di voler sospendere tutti gli annunci pubblicati su Bakeca? ATTENZIONE: verranno sospesi anche se risultassero a pagamento.",
        pendingText: "In Sospensione..",
        defaultText: "SOSPENDI PUBBLICATI",
        idleClass: "btn-danger",
        endpoint: "/annuncio/suspendAllPublished",
        onclick: "suspendPublishedAds(this)",
        errorText: "Si e verificato un errore durante la sospensione di tutti gli annunci pubblicati."
    });
}

function deletePublishedAds(e) {
    updateAllPublishedAdsState(e, {
        confirmText: "Sicuro di voler impostare DELETE per tutti gli annunci pubblicati su Bakeca? ATTENZIONE: verranno marcati come DELETE anche se risultassero a pagamento.",
        pendingText: "In Cancellazione..",
        defaultText: "DELETE PUBBLICATI",
        idleClass: "btn-default",
        endpoint: "/annuncio/deleteAllPublished",
        onclick: "deletePublishedAds(this)",
        errorText: "Si e verificato un errore durante l'aggiornamento a DELETE di tutti gli annunci pubblicati."
    });
}

function requestStorico(annuncio, suspended) {
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
        body: JSON.stringify({ id: annuncio, sus: suspended, panel: QUERY_PANEL })
    }).then((r) => {
        if (r.status == 401) {
            window.location.href = "/";
        } else if (r.status !== 200) {
            return alert("Errore durante il caricamento dello storico.");
        }
        var i = 0;
        r.json().then(async (res) => {
            if (!suspended) {
                clearStorico();
                res.storico.forEach(schedule => {
                    addRptStorico(schedule, i);
                    i++;
                });
                $(".btnCondividi").on("mouseover", () => {
                    var text = "";
                    var id = $(event.currentTarget).data("id");
                    $(event.currentTarget).attr("href", text);

                    $(`.rptItemStorico[data-id='${id}']`).each((idx, x) => {
                        text = text + $(x).find(".rptDescription").text().trim() + "\n";
                    });

                    $(event.currentTarget).attr("href", "whatsapp://send?text=" + encodeURIComponent(text) + "%0a");
                });
            } else {
                res.storico.forEach(schedule => {
                    addRptStoricoSus(schedule);
                });
            }
        });
    });
}

var clearStorico = () => {
    $(".oldStorico").remove();
};

function copyStorico(btn, id) {
    var text = $("#txtCopy");
    text.val("");

    $(`.rptItemStorico[data-id='${id}']`).each((idx, x) => {
        $(text).val($(text).val() + $(x).find(".rptDescription").text().trim() + "\n");
    });

    text.focus();
    text[0].select();
    text[0].setSelectionRange(0, 99999);
    navigator.clipboard.writeText($(text).val());
    ShowAlert("lblCopied");
}

function hasPublishedRemotePost(schedule) {
    return Boolean(schedule && (schedule.urlBK || schedule.remotePostID));
}

function canManageHistorySchedule(schedule) {
    return Boolean(schedule && schedule.state === "OK");
}

function getBakecaStatusAction(schedule) {
    if (schedule.urlBK) {
        return `<a class="btn btn-xs btn-success" href="${schedule.urlBK}" target="_blank">BK</a>`;
    }

    return "<span class='btn btn-xs btn-success'>Bakeca</span>";
}

function getPublishStateConfig(schedule) {
    switch (schedule?.state) {
        case "OK":
            return {
                className: "btn-success",
                label: "PUBBLICATO"
            };
        case "CLOSE":
        case "CLOSED":
            return {
                className: "btn-danger",
                label: "SOSPESO"
            };
        case "DELETE":
            return {
                className: "btn-default",
                label: "DELETE"
            };
        default:
            return {
                className: "btn-warning",
                label: "IN ATTESA"
            };
    }
}

function getPublishStateButtonHtml(schedule) {
    const publishState = getPublishStateConfig(schedule);
    return `<span class="btn btn-xs ${publishState.className} btnPublishState">${publishState.label}</span>`;
}

function configureSuspendedHistoryPublishButton(row, schedule) {
    const publishBtn = row.find(".btnPublishState");
    const deleteBtn = row.find(".btnDeleteState");

    publishBtn.text("PUBBLICA");
    publishBtn.removeClass("btn-success btn-danger btn-default btn-warning").addClass("btn-danger");
    publishBtn.attr("onclick", `republishAds(this, '${schedule.id}', 'btn-danger', 'PUBBLICA')`);
    publishBtn.show();
    deleteBtn.text("DELETE");
    deleteBtn.removeClass("btn-danger btn-success btn-warning").addClass("btn-default");
    deleteBtn.attr("onclick", `deleteAds(this, '${schedule.id}')`);
    deleteBtn.show();
}

function replaceCityPlaceholder(html, city) {
    return html.replace(/@citt[^@]*@/g, city || "Non presente");
}

function configureHistoryActionButtons(row, schedule) {
    const publishBtn = row.find(".btnPublishState");
    const suspendBtn = row.find(".btnSuspend");
    const deleteBtn = row.find(".btnDeleteState");
    const publishState = getPublishStateConfig(schedule);

    publishBtn.hide();
    suspendBtn.hide();
    deleteBtn.hide();
    publishBtn.text(publishState.label);
    publishBtn.removeClass("btn-success btn-danger btn-default btn-warning").addClass(publishState.className);
    publishBtn.attr("onclick", `republishAds(this, '${schedule.id}')`);
    deleteBtn.text("DELETE");
    deleteBtn.removeClass("btn-danger btn-success btn-warning").addClass("btn-default");
    deleteBtn.attr("onclick", `deleteAds(this, '${schedule.id}')`);

    if (canManageHistorySchedule(schedule)) {
        publishBtn.show();
        suspendBtn.show();
        deleteBtn.show();
    }
}

function updateScheduleStateAction(e, ids, options) {
    if (!confirm(options.confirmText)) {
        return;
    }

    $(e).attr("onclick", "void(0)");
    $(e).text(options.pendingText);
    $(e).removeClass(options.idleClass);
    $(e).addClass("btn-warning");
    toggleLoader();

    fetch(options.endpoint, {
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
        if (r.status == 401) {
            window.location.href = "/";
            return;
        }
        
        if (r.status !== 200) {
            $(e).attr("onclick", options.onclick);
            $(e).text(options.defaultText);
            $(e).removeClass("btn-warning");
            $(e).addClass(options.idleClass);
            return alert(options.errorText);
        }

        $(e).closest(".rptItemStorico, .rptItemStoricoSospesi").hide();
        setTimeout(() => {
            location.reload();
        }, 300);
    });
}

var addRptStorico = (sxhedule, i) => {
    $(".rptNoData").hide();
    var root = $("#rptStorico");
    var row = $(root).find(".rptItemStorico").first();
    var newRow = row.clone().removeAttr("style");
    newRow.addClass("oldStorico");

    newRow.attr("data-id", sxhedule.id);
    newRow.data("id", sxhedule.id);

    var premium = "";
    if (sxhedule.hasPremium) {
        premium = " + SUPERTOP";
    }
    if (sxhedule.hasHighlight) {
        premium = " + HIGHLIGHT";
    }
    if (sxhedule.hasEtichetta) {
        premium = " + ETICHETTATOP";
    }
    if (sxhedule.hasVideo) {
        premium = " + VIDEO";
    }

    var text = `[TOP ${sxhedule.typeAnnuncio}${premium}] del ${sxhedule.data.split("T")[0]} alle ${sxhedule.data.split("T")[1].split(":00.")[0]}`;
    newRow.html(newRow.html().replace(/@id@/g, sxhedule.id));
    newRow.html(newRow.html().replace(/@descrizione@/g, text));
    newRow.html(replaceCityPlaceholder(newRow.html(), sxhedule.city));

    var out = "";
    if (sxhedule.dateTimeTop) {
        var oPub = sxhedule.dateTimeTop.split(" - ");
        for (oP of oPub) {
            out = out + `${oP.replace(/ ,/g, ", ").replace(/,/g, ", ")} `;
        }
        newRow.html(newRow.html().replace(/@orari@/g, out));
    } else {
        newRow.find(".dateTimeTop").remove();
    }

    switch (sxhedule.state) {
        case "OK":
            if (hasPublishedRemotePost(sxhedule)) {
                newRow.html(newRow.html().replace(/@stato@/g, getBakecaStatusAction(sxhedule)));
            } else {
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

    switch (sxhedule.payed) {
        case true:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
            break;
        default:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-times text-danger'><i></i></h3>"));
    }

    if (canManageHistorySchedule(sxhedule)) {
        configureHistoryActionButtons(newRow, sxhedule);
    } else {
        newRow.find(".btnPublishState, .btnSuspend, .btnDeleteState").hide();
    }

    newRow.appendTo(root);

    $("#btnWhatapp").attr("href", $("#btnWhatapp").attr("href") + encodeURIComponent(text) + "%0a" + out + "%0a");
};

function suspendAds(e, ids) {
    updateScheduleStateAction(e, ids, {
        confirmText: "Sicuro di voler procedere con la sospensione? ATTENZIONE: l'annuncio verra sospeso anche se risultasse a pagamento.",
        pendingText: "In Sospensione..",
        defaultText: "SOSPENDI",
        idleClass: "btn-danger",
        endpoint: "/annuncio/suspend",
        onclick: `suspendAds(this, '${ids}')`,
        errorText: "Si e verificato un errore durante la sospensione dell'annuncio."
    });
}

function republishAds(e, ids, idleClass = "btn-success", defaultText = "PUBBLICATO") {
    updateScheduleStateAction(e, ids, {
        confirmText: "Sicuro di voler ripubblicare questo annuncio?",
        pendingText: "In Ripubblicazione..",
        defaultText: defaultText,
        idleClass: idleClass,
        endpoint: "/annuncio/republishSchedule",
        onclick: `republishAds(this, '${ids}', '${idleClass}', '${defaultText}')`,
        errorText: "Si e verificato un errore durante l'aggiornamento dello stato REPUBLISH."
    });
}

function deleteAds(e, ids) {
    updateScheduleStateAction(e, ids, {
        confirmText: "Sicuro di voler procedere con il delete? ATTENZIONE: l'annuncio verra marcato come DELETE anche se risultasse a pagamento.",
        pendingText: "In Cancellazione..",
        defaultText: "DELETE",
        idleClass: "btn-default",
        endpoint: "/annuncio/deleteSchedule",
        onclick: `deleteAds(this, '${ids}')`,
        errorText: "Si e verificato un errore durante l'aggiornamento dello stato DELETE."
    });
}

function addRptStoricoSus(sxhedule) {
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
    newRow.html(replaceCityPlaceholder(newRow.html(), sxhedule.city));

    if (sxhedule.dateTimeTop) {
        var out = "";
        var oPub = sxhedule.dateTimeTop.split(" - ");
        for (oP of oPub) {
            out = out + `<p class="fa fa-clock"> ${oP.replace(/ ,/g, ", ").replace(/,/g, ", ")}</p> `;
        }
        newRow.html(newRow.html().replace(/@orari@/g, out));
    } else {
        newRow.find(".dateTimeTop").remove();
    }

    newRow.html(newRow.html().replace(/@stato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
    configureSuspendedHistoryPublishButton(newRow, sxhedule);
    switch (sxhedule.payed) {
        case true:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-check-square text-success'><i></i></h3>"));
            break;
        default:
            newRow.html(newRow.html().replace(/@pagato@/g, "<h3 class='fa fa-times text-danger'><i></i></h3>"));
    }

    newRow.appendTo(root);
}

function deleteStorico(me, idString) {
    toggleLoader();
    let id = parseInt(idString);
    var anID = $("#annuncioID").val();
    if (id) {
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
            if (r.status == 401) {
                window.location.href = "/";
            } else if (r.status !== 200) {
                return alert("Errore durante l'eliminazione dello storico.");
            }
            $(me).parents(".rptItemStorico").hide();
            setTimeout(() => {
                location.reload();
            }, 300);
        });
    }
}
