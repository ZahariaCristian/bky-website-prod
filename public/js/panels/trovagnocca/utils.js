const enableInfoUpdate = () => document.querySelector("#updateInfoBtn")?.removeAttribute("disabled");
const enablePicsUpdate = () => document.querySelector("#updatePicsBtn").removeAttribute("disabled");
const enableScheduleUpdate = () => document.querySelector("#updateScheduleBtn").removeAttribute("disabled");

document.querySelectorAll(".widget-annuncio input, .widget-annuncio textarea, .widget-annuncio select").forEach((input) => {
    input.addEventListener("input", enableInfoUpdate);
    input.addEventListener("change", enableInfoUpdate);
});

const apiInputValue = (name) => {
    const input = document.querySelector(`[name='${name}']`);
    return input ? input.value.trim() : "";
};

const selectInputValue = (name) => {
    const input = document.querySelector(`select[name='${name}']`);
    return input ? input.value : "";
};

const checkboxInputValue = (name) => {
    const input = document.querySelector(`input[name='${name}']`);
    return input ? input.checked : false;
};

const checkedTrovagnoccaTags = (group) => {
    return Array.from(document.querySelectorAll(`input[data-trovagnocca-tag-group='${group}']:checked`))
        .map((input) => input.dataset.trovagnoccaTag || "")
        .filter(Boolean);
};

const getTrovagnoccaTagsData = () => ({
    ethnicity: checkedTrovagnoccaTags("ethnicity"),
    nationality: selectInputValue("serviceNazionalita"),
    breast: checkedTrovagnoccaTags("breast"),
    hair: checkedTrovagnoccaTags("hair"),
    body: checkedTrovagnoccaTags("body"),
    services: checkedTrovagnoccaTags("services"),
    serviceFor: checkedTrovagnoccaTags("serviceFor"),
    servicePlace: checkedTrovagnoccaTags("servicePlace")
});

const normalizeTrovagnoccaInfoCategoryValue = (value) => {
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

const getInfoData = () => {
    const locationInput = document.querySelector("input[name='location']");
    const whatsappInput = document.querySelector("input[name='whatsapp']");
    const telegramInput = document.querySelector("input[name='telegram']");
    const selectedCategory = document.querySelector("select[name='categorie']")?.value || "";

    const data = {
        title: document.querySelector("textarea[name='title']").value,
        description: document.querySelector("textarea[name='description']").value,
        city: document.querySelector("input[name='city']").value,
        phone: document.querySelector("input[name='phone']").value,
        name: document.querySelector("input[name='name']").value,
        categorie: normalizeTrovagnoccaInfoCategoryValue(selectedCategory),
        sono: normalizeTrovagnoccaInfoCategoryValue(selectedCategory),
        age: apiInputValue("age"),
        location: locationInput ? locationInput.value : "",
        whatsapp: whatsappInput ? whatsappInput.checked : false,
        telegram: telegramInput ? telegramInput.checked : false,
        serviceNazionalita: selectInputValue("serviceNazionalita"),
        trovagnoccaTags: getTrovagnoccaTagsData()
    };

    return data;
};
