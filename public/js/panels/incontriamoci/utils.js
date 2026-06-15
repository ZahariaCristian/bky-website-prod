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

const checkedincontriamociTags = (group) => {
    return Array.from(document.querySelectorAll(`input[data-incontriamoci-tag-group='${group}']:checked`))
        .map((input) => input.dataset.incontriamociTag || "")
        .filter(Boolean);
};

const getincontriamociTagsData = () => ({
    ethnicity: checkedincontriamociTags("ethnicity"),
    nationality: selectInputValue("serviceNazionalita"),
    eye: checkedincontriamociTags("eye"),
    hair: checkedincontriamociTags("hair"),
    body: checkedincontriamociTags("body"),
    particularSigns: checkedincontriamociTags("particularSigns"),
    services: checkedincontriamociTags("services"),
    serviceFor: checkedincontriamociTags("serviceFor"),
    servicePlace: checkedincontriamociTags("servicePlace"),
    paymentMethods: checkedincontriamociTags("paymentMethods")
});

const normalizeincontriamociInfoCategoryValue = (value) => {
    const normalizedPanelValue = window.normalizePanelCategoryValue ? window.normalizePanelCategoryValue(value) : "";
    if (normalizedPanelValue === "TRANS" || normalizedPanelValue === "COPPIE" || normalizedPanelValue === "UOMOUOMO") {
        return normalizedPanelValue;
    }
    if (normalizedPanelValue) return "DONNAUOMO";

    const normalized = `${value || ""}`.toLowerCase();
    if (normalized.includes("trans")) return "TRANS";
    if (normalized.includes("copp") || normalized === "coppia") return "COPPIE";
    if (normalized.includes("uomouomo") || normalized === "gay" || normalized.includes("uomo uomo")) return "UOMOUOMO";
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
        city: apiInputValue("city"),
        phone: document.querySelector("input[name='phone']").value,
        name: document.querySelector("input[name='name']").value,
        categorie: normalizeincontriamociInfoCategoryValue(selectedCategory),
        sono: normalizeincontriamociInfoCategoryValue(selectedCategory),
        age: apiInputValue("age"),
        location: locationInput ? locationInput.value : "",
        whatsapp: whatsappInput ? whatsappInput.checked : false,
        telegram: telegramInput ? telegramInput.checked : false,
        serviceNazionalita: selectInputValue("serviceNazionalita"),
        incontriamociTags: getincontriamociTagsData()
    };

    return data;
};
