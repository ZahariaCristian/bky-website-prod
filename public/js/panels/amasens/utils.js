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

const normalizeincontriamociInfoCategoryValue = (value) => {
    const normalizedPanelValue = window.normalizePanelCategoryValue ? window.normalizePanelCategoryValue(value) : "";
    if (normalizedPanelValue) {
        return normalizedPanelValue;
    }

    const normalized = `${value || ""}`.toLowerCase();
    if (normalized.includes("trans")) return "TRANS";
    if (normalized.includes("copp") || normalized === "coppia") return "COPPIE";
    if (normalized.includes("massaggi") || normalized.includes("benessere")) return "MASSAGGI";
    return "DONNAUOMO";
};

const getInfoData = () => {
    const locationInput = document.querySelector("input[name='location']");
    const whatsappInput = document.querySelector("input[name='whatsapp']");
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
        telegram: false,
        serviceNazionalita: "",
        incontriamociTags: {}
    };

    return data;
};
