const URL_PARAMS = new URLSearchParams(window.location.search);
const QUERY_DAY = URL_PARAMS.get("day");
const QUERY_NEW = URL_PARAMS.get("edit");
const QUERY_PANEL = URL_PARAMS.get("panel");
const EDIT = URL_PARAMS.get("enableEdit");
const PANEL_PLATFORM = `${QUERY_PANEL || "trovagnocca"}`.toLowerCase();

// var blacklist = [];
var tmpID = 0;
var sCalendar = null;
const croppers = {};
let images = []; //slider images
var picIds = [];
var pubs = {};
var currentDay = new Date().toLocaleDateString("zh-hans-cn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).replace(/\//g, "-");

$(() => {
    //This is New Panel
    if (QUERY_NEW == "new") {
        $(".widget-annuncio .form-control, .widget-annuncio .form-check-input, .widget-annuncio .custom-select, .servizi-box input, .trovagnocca-tags-section input").prop('disabled', false);
    } else {
        if (QUERY_DAY) {
            currentDay = QUERY_DAY;
        }
        //This is Edit Panel
        if (QUERY_NEW) {
            let anID = parseInt(QUERY_NEW);
            annuncioID.value = anID;
            loadAnnuncio(anID);
            loadStorico(anID);
            // setInterval((id) => {
            //     loadStorico(id);
            // }, 60000, anID);
        }
    }
});


$("html").on("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(".dragHere").show(() => {
        setTimeout(() => {
            $(".dragHere").hide();
        }, 3000);
    });
});

$("html").on("drop", function (e) { e.preventDefault(); e.stopPropagation(); });

$('.dragHere').on('drop', function (e) {
    e.stopPropagation();
    e.preventDefault();

    $(".dragHere > h1").text("Caricamento..");

    const phone = document.querySelector("input[name='phone']").value;
    //var files = e.originalEvent.dataTransfer.files;

    loadImage(e.originalEvent.dataTransfer);
});

// Add options of latest Ads
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
        if (r.status == 401) {
            window.location.href = "/";
        } else if (r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento delle donne.");
        }
        r.json().then(async (res) => {
            res.donne.forEach(donna => addDonneCmbDonne(donna));
        });
    });

    // fetch("/annuncio/blacklist", {
    //     method: "GET",
    //     mode: "cors",
    //     cache: "no-cache",
    //     credentials: "same-origin",
    //     headers: {
    //         "Content-Type": "application/json",
    //     },
    //     redirect: "follow",
    //     referrerPolicy: "no-referrer",
    // }).then((r) => {
    //     if (r.status == 401) {
    //         window.location.href = "/";
    //     } else if (r.status !== 200) {
    //         return alert("❌ Si è verificato un errore durante il caricamento della blacklist.");
    //     }
    //     r.json().then(async (res) => {
    //         res.forEach(text => {
    //             blacklist.push(text);
    //         });
    //     });
    // });
}, 100);

//Upload from link by click button(Carica da link)
document.querySelector("#caricalink-button").addEventListener("click", () => {
    const url = document.querySelector("#link-to-scrape").value;
    if (!url) return ShowAlert("custom", "🔗 Assicurati di inserire prima un link.");//alert("🔗 Assicurati di inserire prima un link.");
    console.log("scrape trovagnocca.com")
    toggleLoader();
    fetch("/annuncio/scrapeTrovagnocca", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ url, panel: PANEL_PLATFORM }),
    }).then((r) => {
        toggleLoader();
        if (r.status == 500) return alert(
            "⚠ L'annuncio richiesto non contiene il numero di telefono.",
        );
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento dati da URL",
        );
        r.json().then((res) => {
            if (!res.id) return alert(
                "⚠ Si è verificato un errore durante il caricamento dati da URL",
            );

            var link = "/annuncio.html?edit=" + res.id;
            // console.log(res,'scrape bakeca.it result')
            // alert(JSON.stringify(res));
            link = link + "&panel=" + PANEL_PLATFORM;

            if (res.donna == null) {//Donna is null
                return window.location = link + "&enableEdit=true";
            }
            window.location = link;
        });
    });
});

//Load latest ad by click button(Carica ultimo annuncio di)
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
        body: JSON.stringify({ phone, key: localStorage.getItem("key") }),
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

//Select option in Latest Ads(Carica ultimo annuncio di:)
$("#select2_3").on("change", (x) => {
    var goToLink = "/annuncio.html?edit=" + x.target.value;
    window.location = goToLink + "&panel=" + PANEL_PLATFORM;
});

//When click btn to show all in Images
$("#btnShowImg").on("click", () => {
    if ($(".removed").is(":visible")) {
        $(".persistent").css("display", "flex").fadeIn();
        $(".removed").hide();
    } else {
        $(".removed").css("display", "flex").fadeIn();
        $(".persistent").hide();
    }
});

const startEditPost = () => {
    $(".widget-annuncio .form-control, .widget-annuncio .form-check-input, .widget-annuncio .custom-select").prop('disabled', false);
    $(".servizi-box input").prop('disabled', false);
    $("#updateInfoBtn").prop('disabled', false);
}

const normalizeMegaescortCategoryValue = (value) => {
    if (window.normalizePanelCategoryValue) return window.normalizePanelCategoryValue(value);
    const normalized = `${value || ""}`.toLowerCase();
    if (normalized.includes("trans")) return "TRANS";
    if (normalized.includes("copp") || normalized === "coppia") return "COPPIE";
    if (normalized.includes("uomodonna") || normalized.includes("uomo donna") || normalized.includes("gigolo")) return "UOMODONNA";
    if (normalized.includes("uomouomo") || normalized === "gay" || normalized.includes("uomo uomo")) return "UOMOUOMO";
    if (normalized.includes("donnadonna") || normalized.includes("donna donna") || normalized.includes("lesbo")) return "DONNADONNA";
    if (normalized.includes("amici")) return "AMICI";
    if (normalized.includes("anima gemella") || normalized.includes("animagemella")) return "ANIMAGEMELLA";
    return "DONNAUOMO";
};

// Append options of latest Ads(Carica ultimo annuncio di:) 
var addDonneCmbDonne = (donna) => {
    if (donna.tblAnnuncis[0]) {
        var root = $("#select2_3");
        var row = $(root).find("option").first();
        var newRow = row.clone().removeAttr("selected");

        if (donna.tblAnnuncis[0].id == QUERY_NEW) {
            $('#s2id_select2_3 a span font font').text(`${donna.name} (${donna.phone})`)
            // newRow.prop("selected", true);  // ✅ Use prop() to select
        }
        newRow[0].value = donna.tblAnnuncis[0].id;
        newRow[0].text = `${donna.name} (${donna.phone})`;
        newRow.appendTo(root);
    }
};

//Get and Load Advertise
const loadAnnuncio = (id) => {
    if (id) {
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
            body: JSON.stringify({ id, panel: PANEL_PLATFORM })
        }).then((r) => {
            if (r.status !== 200) {
                alert("⚠ Si è verificato un errore durante il caricamento dati");
                window.location.href = "/listaAnnunci.html";
            }
            r.json().then(async (res) => {
                loadAdvertisement(res);
            });
            //document.querySelector(".carica-section").remove();
            document.querySelector("#content h1").innerHTML = "<i>Gestisci l'annuncio-Trovagnocca</i>";
        });
    }
};

const setFieldValue = (selector, value) => {
    const field = document.querySelector(selector);
    if (field) field.value = (value === null || value === undefined) ? "" : value;
};

const setCheckboxValue = (name, value) => {
    const field = document.querySelector(`input[name='${name}']`);
    if (field) field.checked = Boolean(value);
};

const normalizeTrovagnoccaTagValue = (value) => `${value || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const setTrovagnoccaTagGroupValues = (group, values = []) => {
    const wanted = new Set((Array.isArray(values) ? values : [])
        .map(normalizeTrovagnoccaTagValue)
        .filter(Boolean));

    document.querySelectorAll(`input[data-trovagnocca-tag-group='${group}']`).forEach((input) => {
        input.checked = wanted.has(normalizeTrovagnoccaTagValue(input.dataset.trovagnoccaTag));
    });
};

const setSelectValueByValueOrText = (selector, value) => {
    const select = document.querySelector(selector);
    if (!select || !value) return;

    const normalizeSelectText = (text) => `${text || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z_ ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const normalizedValue = normalizeSelectText(value);
    for (const option of select.options) {
        const normalizedOptionValue = normalizeSelectText(option.value);
        const normalizedOptionText = normalizeSelectText(option.textContent);
        if (
            normalizedOptionValue === normalizedValue ||
            normalizedOptionText === normalizedValue ||
            normalizedOptionText.includes(normalizedValue) ||
            normalizedOptionValue.replace(/^nationality_/, "") === normalizedValue
        ) {
            select.value = option.value;
            return;
        }
    }
};

const setPhoneVerified = () => {
    const verifyButton = document.querySelector("#verify-button");
    const label = document.querySelector(".phone-panel > p");
    if (label) label.textContent = "Verificato";
    if (verifyButton) {
        verifyButton.innerHTML = "<i class='fa fa-check'></i>";
        verifyButton.setAttribute("disabled", true);
        verifyButton.setAttribute("class", "btn btn-success");
    }
};

const loadAdvertisement = async (res) => {
    ["title", "description", "city", "phone", "name", "donnaID"].forEach((info) => {
        document.querySelector(`${(info == "description" || info == "title" || info == "note") ? "textarea" : "input"}[name='${info}']`).value = (res[info] === null || res[info] === undefined) ? "" : res[info];
    });
    const categoryValue = normalizeMegaescortCategoryValue(res.categorie || res.sono);
    setFieldValue("select[name='categorie']", categoryValue);
    setSelectValueByValueOrText("select[name='serviceNazionalita']", res.serviceNazionalita);
    setFieldValue("input[name='location']", res.location || "");
    setFieldValue("input[name='age']", res.age || "");
    const whatsappInput = document.querySelector("input[name='whatsapp']");
    const telegramInput = document.querySelector("input[name='telegram']");
    if (whatsappInput) whatsappInput.checked = Boolean(res.hasWhatapp);
    if (telegramInput) telegramInput.checked = Boolean(res.hasTelegram);
    const tags = res.trovagnoccaTags || {};
    if (!tags.ethnicity) {
        tags.ethnicity = [
            res.serviceAfricana ? "Africana" : "",
            res.serviceAraba ? "Araba" : "",
            res.serviceAsiatica ? "Asiatica" : "",
            res.serviceCaucasica ? "Caucasica" : "",
            res.serviceItaliana ? "Europea" : "",
            res.serviceLatina ? "Latina" : ""
        ].filter(Boolean);
    }
    if (!tags.breast) {
        tags.breast = [
            res.serviceSNaturale ? "Seno Naturale" : "",
            res.serviceSRifatto ? "Seno Rifatto" : ""
        ].filter(Boolean);
    }
    if (!tags.hair) {
        tags.hair = [
            res.serviceCBiondi ? "Capelli Biondi" : "",
            res.serviceCMarroni ? "Capelli Marroni" : "",
            res.serviceCNeri ? "Capelli Neri" : "",
            res.serviceCRossi ? "Capelli Rossi" : ""
        ].filter(Boolean);
    }
    if (!tags.body) {
        tags.body = [
            res.serviceFormoso ? "Formoso" : "",
            res.serviceMagro ? "Magro" : ""
        ].filter(Boolean);
    }
    setTrovagnoccaTagGroupValues("ethnicity", tags.ethnicity);
    setTrovagnoccaTagGroupValues("breast", tags.breast);
    setTrovagnoccaTagGroupValues("hair", tags.hair);
    setTrovagnoccaTagGroupValues("body", tags.body);
    setTrovagnoccaTagGroupValues("services", tags.services);
    setTrovagnoccaTagGroupValues("serviceFor", tags.serviceFor);
    setTrovagnoccaTagGroupValues("servicePlace", tags.servicePlace);
    if (res.phone) setPhoneVerified();

    // if (EDIT == "true") {
    //     setTimeout(() => {
    //         alert("Il numero di telefono non'è stato trovato, perfavore completa l'annuncio manualmente prima di procedere.")
    //         startEditPost();
    //         //$("#btnUpdateSchedul").hide();
    //     }, 500);
    // } else {

    $(".widget-after").show(() => {
        $('html,body').animate({
            scrollTop: $(".widget-after").offset().top
        }, 'fast');
    });
    // }

    if (res.storagePics) {
        await loadStoragePics(res.phone);
    } else {
        if (res.images)
            res.images.forEach((img) => {
                addImage(img.src, img.id, img.isHidden, img.applyPhone, img.origin);
            });
    };

    pubs = res.schedule !== undefined ? res.schedule : {};
    console.log(pubs, currentDay, "loadAdvertisement")
    if (JSON.stringify(pubs) !== "{}") {
        // const scheduleDays = Object.keys(pubs).sort();
        // const dayToLoad = pubs[currentDay] ? currentDay : scheduleDays[0];
        const dayToLoad = currentDay;
        currentDay = dayToLoad;
        console.log(currentDay, dayToLoad, pubs,  'currentDay in loadAdvertisement')
        $("#txtDate").val(dayToLoad);
        loadDay(dayToLoad);
    }
    setTimeout(() => {
        $("#updateInfoBtn").prop("disabled", true);
        // document.querySelector("input[name='phone']").setAttribute("disabled", true);
        // document.querySelectorAll(".input-editor").forEach(btn => {
        //     const inputEl = document.querySelector(`.form-control[name="${btn.parentElement.attributes.for.value}"]`);
        //     inputEl.setAttribute("disabled", true);
        // });
    }, 300);
}
