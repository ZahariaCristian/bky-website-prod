(function () {
    const CATEGORY_VALUES = {
        DONNAUOMO: "DONNAUOMO",
        UOMODONNA: "UOMODONNA",
        UOMOUOMO: "UOMOUOMO",
        DONNADONNA: "DONNADONNA",
        TRANS: "TRANS",
        COPPIE: "COPPIE",
        AMICI: "AMICI",
        ANIMAGEMELLA: "ANIMAGEMELLA",
        MASSAGGI: "MASSAGGI",
    };

    const CATEGORY_OPTIONS = [
        { value: CATEGORY_VALUES.DONNAUOMO, label: "Donna Cerca Uomo" },
        { value: CATEGORY_VALUES.UOMODONNA, label: "Uomo Cerca Donna" },
        { value: CATEGORY_VALUES.UOMOUOMO, label: "Uomo Cerca Uomo" },
        { value: CATEGORY_VALUES.DONNADONNA, label: "Donna Cerca Donna" },
        { value: CATEGORY_VALUES.TRANS, label: "Trans" },
        { value: CATEGORY_VALUES.COPPIE, label: "Coppie" },
        { value: CATEGORY_VALUES.AMICI, label: "Cerco Amici" },
        { value: CATEGORY_VALUES.ANIMAGEMELLA, label: "Cerco L'Anima Gemella" },
        { value: CATEGORY_VALUES.MASSAGGI, label: "Massaggi" },
    ];

    const PANEL_CATEGORY_VALUES = {
        bakecaincontrii: [
            CATEGORY_VALUES.DONNAUOMO,
            CATEGORY_VALUES.UOMODONNA,
            CATEGORY_VALUES.UOMOUOMO,
            CATEGORY_VALUES.DONNADONNA,
            CATEGORY_VALUES.TRANS,
            CATEGORY_VALUES.COPPIE,
            CATEGORY_VALUES.AMICI,
            CATEGORY_VALUES.ANIMAGEMELLA,
        ],
        bakeca: [
            CATEGORY_VALUES.DONNAUOMO,
            CATEGORY_VALUES.MASSAGGI,
        ],
        megaescort: [
            CATEGORY_VALUES.DONNAUOMO,
            CATEGORY_VALUES.UOMODONNA,
            CATEGORY_VALUES.UOMOUOMO,
            CATEGORY_VALUES.TRANS,
            CATEGORY_VALUES.COPPIE,
            CATEGORY_VALUES.MASSAGGI,
        ],
        trovagnocca: [
            CATEGORY_VALUES.DONNAUOMO,
            CATEGORY_VALUES.UOMODONNA,
            CATEGORY_VALUES.UOMOUOMO,
            CATEGORY_VALUES.DONNADONNA,
            CATEGORY_VALUES.TRANS,
            CATEGORY_VALUES.COPPIE,
            CATEGORY_VALUES.MASSAGGI,
        ],
    };

    const PANEL_CATEGORY_LABELS = {
        bakeca: {
            [CATEGORY_VALUES.DONNAUOMO]: "Amore e incontri",
            [CATEGORY_VALUES.MASSAGGI]: "Massaggi - benessere",
        },
        megaescort: {
            [CATEGORY_VALUES.DONNAUOMO]: "Escort",
            [CATEGORY_VALUES.UOMODONNA]: "Gigolo",
            [CATEGORY_VALUES.UOMOUOMO]: "Gay",
            [CATEGORY_VALUES.TRANS]: "Trans",
            [CATEGORY_VALUES.COPPIE]: "Coppia",
            [CATEGORY_VALUES.MASSAGGI]: "Massaggi",
        },
        trovagnocca: {
            [CATEGORY_VALUES.DONNAUOMO]: "Escort",
            [CATEGORY_VALUES.UOMODONNA]: "Uomo Cerca Donna",
            [CATEGORY_VALUES.UOMOUOMO]: "Uomo Cerca Uomo",
            [CATEGORY_VALUES.DONNADONNA]: "Donna Cerca Donna",
            [CATEGORY_VALUES.TRANS]: "Trans - Travestiti",
            [CATEGORY_VALUES.COPPIE]: "Coppie",
            [CATEGORY_VALUES.MASSAGGI]: "Massaggi",
        },
    };

    const normalizeCategoryValue = (value) => {
        const normalized = `${value || ""}`
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[-_]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (!normalized) return CATEGORY_VALUES.DONNAUOMO;
        if (normalized === "donnauomo" || normalized.includes("donna uomo") || normalized.includes("donna cerca uomo") || normalized === "escort") return CATEGORY_VALUES.DONNAUOMO;
        if (normalized === "uomodonna" || normalized.includes("uomo donna") || normalized.includes("uomo cerca donna") || normalized.includes("gigolo")) return CATEGORY_VALUES.UOMODONNA;
        if (normalized === "uomouomo" || normalized.includes("uomo uomo") || normalized.includes("uomo cerca uomo") || normalized.includes("gay")) return CATEGORY_VALUES.UOMOUOMO;
        if (normalized === "donnadonna" || normalized.includes("donna donna") || normalized.includes("donna cerca donna") || normalized.includes("lesbo")) return CATEGORY_VALUES.DONNADONNA;
        if (normalized.includes("trans") || normalized.includes("travest")) return CATEGORY_VALUES.TRANS;
        if (normalized.includes("copp") || normalized === "coppia") return CATEGORY_VALUES.COPPIE;
        if (normalized.includes("amici") || normalized.includes("cerco amici")) return CATEGORY_VALUES.AMICI;
        if (normalized.includes("anima gemella") || normalized.includes("animagemella")) return CATEGORY_VALUES.ANIMAGEMELLA;
        if (normalized.includes("massaggi") || normalized.includes("benessere")) return CATEGORY_VALUES.MASSAGGI;
        if (normalized.includes("incontri amore") || normalized.includes("amore incontri")) return CATEGORY_VALUES.DONNAUOMO;

        return CATEGORY_VALUES.DONNAUOMO;
    };

    const populateCategorySelect = (select) => {
        if (!select) return;
        const selected = normalizeCategoryValue(select.value);
        const panel = `${select.dataset.categoryPanel || select.dataset.panel || ""}`.toLowerCase();
        const allowedValues = PANEL_CATEGORY_VALUES[panel] || CATEGORY_OPTIONS.map((option) => option.value);
        const labelOverrides = PANEL_CATEGORY_LABELS[panel] || {};
        const options = CATEGORY_OPTIONS.filter((option) => allowedValues.includes(option.value));
        const selectedIsAllowed = allowedValues.includes(selected);

        select.innerHTML = options
            .map((option) => `<option value="${option.value}">${labelOverrides[option.value] || option.label}</option>`)
            .join("");
        select.value = selectedIsAllowed ? selected : (options[0]?.value || "");
    };

    const populateCategorySelects = (root) => {
        const scope = root || document;
        scope.querySelectorAll("select[data-common-categories='true']").forEach(populateCategorySelect);
    };

    window.PANEL_CATEGORY_VALUES = CATEGORY_VALUES;
    window.PANEL_CATEGORY_OPTIONS = CATEGORY_OPTIONS;
    window.PANEL_CATEGORY_BY_PLATFORM = PANEL_CATEGORY_VALUES;
    window.PANEL_CATEGORY_LABELS = PANEL_CATEGORY_LABELS;
    window.normalizePanelCategoryValue = normalizeCategoryValue;
    window.populatePanelCategorySelect = populateCategorySelect;
    window.populatePanelCategorySelects = populateCategorySelects;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => populateCategorySelects(document));
    } else {
        populateCategorySelects(document);
    }
})();
