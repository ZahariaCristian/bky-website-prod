const URL_PARAMS = new URLSearchParams(window.location.search);
const QUERY_DAY = URL_PARAMS.get("day");
const QUERY_NEW = URL_PARAMS.get("edit");
const QUERY_PANEL = URL_PARAMS.get("panel");
const EDIT = URL_PARAMS.get("enableEdit");

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
        $(".widget-annuncio .form-control, .widget-annuncio .form-check-input").prop('disabled', false);
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
    console.log("scrape bakeca.it")
    toggleLoader();
    fetch("/annuncio/scrapeBakeca", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ url, panel: QUERY_PANEL }),
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
            if (QUERY_PANEL) {//Reset Panel after upload data
                link = link + "&panel=" + QUERY_PANEL
            }

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
    if (QUERY_PANEL) {
        window.location = goToLink + "&panel=" + QUERY_PANEL;
    } else {
        window.location = goToLink
    }
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
    $(".widget-annuncio .form-control, .widget-annuncio .form-check-input").prop('disabled', false);
    // $(".servizi-box input").prop('disabled', false);
    $("#updateInfoBtn").prop('disabled', false);
}

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
            body: JSON.stringify({ id, panel: QUERY_PANEL })
        }).then((r) => {
            if (r.status !== 200) {
                alert("⚠ Si è verificato un errore durante il caricamento dati");
                window.location.href = "/listaAnnunci.html";
            }
            r.json().then(async (res) => {
                loadAdvertisement(res);
            });
            //document.querySelector(".carica-section").remove();
            document.querySelector("#content h1").innerHTML = "<i>Gestisci l'annuncio-Bakeca.it</i>";
        });
    }
};

const loadAdvertisement = async (res) => {
    ["title", "description", "city", "phone", "name", "donnaID"].forEach((info) => {
        document.querySelector(`${(info == "description" || info == "title" || info == "note") ? "textarea" : "input"}[name='${info}']`).value = (res[info] === null || res[info] === undefined) ? "" : res[info];
    });
    document.querySelector("select[name='sex']").value = res.sono;
    if (res.categorie) {
        document.querySelector("select[name='categorie']").value = window.normalizePanelCategoryValue
            ? window.normalizePanelCategoryValue(res.categorie)
            : res.categorie;
    }

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
    if (JSON.stringify(pubs) !== "{}")
        loadDay(currentDay);
    setTimeout(() => {
        $("#updateInfoBtn").prop("disabled", true);
        // document.querySelector("input[name='phone']").setAttribute("disabled", true);
        // document.querySelectorAll(".input-editor").forEach(btn => {
        //     const inputEl = document.querySelector(`.form-control[name="${btn.parentElement.attributes.for.value}"]`);
        //     inputEl.setAttribute("disabled", true);
        // });
    }, 300);
}
