(function () {
    const cityOptions = [
        ["1", "agrigento"], ["2", "alessandria"], ["3", "ancona"], ["4", "aosta"],
        ["5", "arezzo"], ["6", "ascoli"], ["7", "asti"], ["8", "avellino"],
        ["9", "bari"], ["10", "barletta"], ["11", "belluno"], ["12", "benevento"],
        ["13", "bergamo"], ["14", "biella"], ["15", "bologna"], ["16", "bolzano"],
        ["17", "brescia"], ["18", "brindisi"], ["19", "cagliari"], ["20", "caltanissetta"],
        ["21", "campobasso"], ["22", "carbonia iglesias"], ["23", "caserta"], ["24", "catania"],
        ["25", "catanzaro"], ["26", "chieti"], ["27", "como"], ["28", "cosenza"],
        ["29", "cremona"], ["30", "crotone"], ["31", "cuneo"], ["32", "enna"],
        ["33", "fermo"], ["34", "ferrara"], ["35", "firenze"], ["36", "foggia"],
        ["37", "forli"], ["38", "frosinone"], ["39", "genova"], ["183", "gorizia"],
        ["40", "grosseto"], ["41", "imperia"], ["42", "isernia"], ["50", "l'Aquila"],
        ["43", "la spezia"], ["44", "latina"], ["45", "lecce"], ["46", "lecco"],
        ["47", "livorno"], ["48", "lodi"], ["49", "lucca"], ["51", "macerata"],
        ["52", "mantova"], ["53", "massa carrara"], ["54", "matera"], ["55", "medio campidano"],
        ["56", "messina"], ["57", "milano"], ["58", "modena"], ["59", "monza"],
        ["60", "napoli"], ["61", "novara"], ["62", "nuoro"], ["63", "ogliastra"],
        ["64", "olbia tempio"], ["65", "oristano"], ["66", "padova"], ["67", "palermo"],
        ["68", "parma"], ["69", "pavia"], ["70", "perugia"], ["71", "pescara"],
        ["72", "piacenza"], ["73", "pisa"], ["74", "pistoia"], ["184", "pordenone"],
        ["75", "potenza"], ["76", "prato"], ["78", "ragusa"], ["79", "ravenna"],
        ["80", "reggio calabria"], ["77", "reggio emilia"], ["81", "rieti"], ["82", "rimini"],
        ["83", "roma"], ["84", "rovigo"], ["85", "salerno"], ["86", "sassari"],
        ["87", "savona"], ["88", "siena"], ["89", "siracusa"], ["90", "sondrio"],
        ["91", "taranto"], ["92", "teramo"], ["93", "terni"], ["94", "torino"],
        ["95", "trapani"], ["96", "trento"], ["97", "treviso"], ["185", "trieste"],
        ["186", "udine"], ["98", "urbino"], ["99", "varese"], ["100", "venezia"],
        ["101", "verbania"], ["102", "vercelli"], ["103", "verona"], ["104", "vibo valentia"],
        ["105", "vicenza"], ["106", "viterbo"]
    ];

    const aliases = {
        "forli cesena": "forli",
        "forli": "forli",
        "monza brianza": "monza",
        "pesaro urbino": "urbino",
        "pesaro e urbino": "urbino",
        "barletta andria trani": "barletta",
        "verbano cusio ossola": "verbania",
        "massa carrara": "massa carrara",
        "laquila": "l'aquila"
    };

    const normalize = (value) => `${value || ""}`.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ")
        .replace(/\s+/g, " ").trim().toLowerCase();

    const canonicalCity = (value) => {
        const idMatch = cityOptions.find(([id]) => `${id}` === `${value || ""}`.trim());
        if (idMatch) return idMatch[1];
        const normalized = normalize(value);
        const alias = aliases[normalized] || normalized;
        const match = cityOptions.find(([, name]) => normalize(name) === alias);
        return match ? match[1] : "";
    };

    const populate = (root) => {
        const scope = root || document;
        scope.querySelectorAll("select[data-trovagnocca-cities='true']").forEach((select) => {
            const current = canonicalCity(select.value);
            select.innerHTML = '<option value="">Seleziona città</option>' + cityOptions
                .map(([id, name]) => `<option value="${name}" data-city-id="${id}">${name}</option>`)
                .join("");
            if (current) select.value = current;
        });
    };

    window.TROVAGNOCCA_CITY_OPTIONS = cityOptions.map(([id, name]) => ({ id, name }));
    window.normalizeTrovagnoccaCity = canonicalCity;
    window.setTrovagnoccaCityValue = (value) => {
        const select = document.querySelector("select[name='city']");
        const canonical = canonicalCity(value);
        if (select) select.value = canonical;
        return Boolean(canonical);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => populate(document));
    } else {
        populate(document);
    }
})();
