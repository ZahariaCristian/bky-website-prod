const enableInfoUpdate = () => document.querySelector("#updateInfoBtn").removeAttribute("disabled");
const enablePicsUpdate = () => document.querySelector("#updatePicsBtn").removeAttribute("disabled");
const enableScheduleUpdate = () => document.querySelector("#updateScheduleBtn").removeAttribute("disabled");

const apiInputValue = (name) => {
    const input = document.querySelector(`[name='${name}']`);
    return input ? input.value.trim() : "";
};

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

const getMegaescortApiNote = () => {
    const tags = {
        "età": apiInputValue("age"),
        "nazionalità": apiInputValue("tagNazionalita"),
        "capelli": apiInputValue("tagCapelli"),
        "corporatura": apiInputValue("tagCorporatura"),
        "seno": apiInputValue("tagSeno"),
        "altezza": apiInputValue("tagAltezza"),
        "servizio": apiInputValue("tagServizio"),
    };

    Object.keys(tags).forEach((key) => {
        if (!tags[key]) delete tags[key];
    });

    return JSON.stringify({
        megaescortApi: {
            zone: apiInputValue("apiZone"),
            other_cities: apiInputValue("apiOtherCities")
                .split(",")
                .map((city) => city.trim())
                .filter(Boolean),
            tags
        }
    });
};

const getInfoData = () => {
    const locationInput = document.querySelector("input[name='location']");
    const whatsappInput = document.querySelector("input[name='whatsapp']");
    const selectedCategory = document.querySelector("select[name='categorie']").value;
    const selectedSex = document.querySelector("select[name='sex']").value;

    return {
        title: document.querySelector("textarea[name='title']").value,
        description: document.querySelector("textarea[name='description']").value,
        city: document.querySelector("input[name='city']").value,
        phone: document.querySelector("input[name='phone']").value,
        name: document.querySelector("input[name='name']").value,
        categorie: normalizeMegaescortCategoryValue(selectedCategory || selectedSex),
        sono: normalizeMegaescortCategoryValue(selectedSex || selectedCategory),
        age: apiInputValue("age"),
        location: locationInput ? locationInput.value : "",
        whatsapp: whatsappInput ? whatsappInput.checked : false,
        serviceNazionalita: apiInputValue("tagNazionalita"),
        note: getMegaescortApiNote(),
    };
};
