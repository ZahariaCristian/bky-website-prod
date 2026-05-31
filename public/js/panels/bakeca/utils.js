const enableInfoUpdate = () => document.querySelector("#updateInfoBtn").removeAttribute("disabled");
const enablePicsUpdate = () => document.querySelector("#updatePicsBtn").removeAttribute("disabled");
const enableScheduleUpdate = () => document.querySelector("#updateScheduleBtn").removeAttribute("disabled");

const getInfoData = () => {
    const locationInput = document.querySelector("input[name='location']");
    const whatsappInput = document.querySelector("input[name='whatsapp']");

    return {
        title: document.querySelector("textarea[name='title']").value,
        description: document.querySelector("textarea[name='description']").value,
        city: document.querySelector("input[name='city']").value,
        phone: document.querySelector("input[name='phone']").value,
        name: document.querySelector("input[name='name']").value,
        categorie: window.normalizePanelCategoryValue
            ? window.normalizePanelCategoryValue(document.querySelector("select[name='categorie']").value)
            : document.querySelector("select[name='categorie']").value,
        sono: document.querySelector("select[name='sex']").value,
        location: locationInput ? locationInput.value : "",
        whatsapp: whatsappInput ? whatsappInput.checked : false,
    };
};
