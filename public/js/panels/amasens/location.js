(function () {
    const regions = [
        ["64969", "Abruzzo"], ["64981", "Basilicata"], ["64984", "Calabria"],
        ["64990", "Campania"], ["65006", "Emilia-Romagna"], ["65016", "Friuli-Venezia Giulia"],
        ["65021", "Lazio"], ["65026", "Liguria"], ["65031", "Lombardia"],
        ["65044", "Marche"], ["65050", "Molise"], ["65053", "Piemonte"],
        ["64974", "Puglia"], ["64997", "Sardegna"], ["65062", "Sicilia"],
        ["502361", "Toscana"], ["65083", "Trentino-Alto Adige"], ["65086", "Umbria"],
        ["65089", "Valle d'Aosta"], ["65091", "Veneto"]
    ];

    const regionSelect = document.querySelector("#amasensRegion");
    const provinceSelect = document.querySelector("#amasensProvince");
    const comuneSelect = document.querySelector("#amasensComune");
    if (!regionSelect || !provinceSelect || !comuneSelect) return;

    const normalize = (value) => `${value || ""}`.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ")
        .replace(/\s+/g, " ").trim().toLowerCase();

    const resetSelect = (select, label) => {
        select.innerHTML = "";
        select.add(new Option(label, ""));
    };

    const fillSelect = (select, items, label) => {
        resetSelect(select, label);
        items.forEach((item) => {
            const option = new Option(item.s_name, item.s_name);
            option.dataset.locationId = `${item.pk_i_id}`;
            select.add(option);
        });
    };

    const selectByName = (select, name) => {
        const target = normalize(name);
        const option = Array.from(select.options).find((item) => normalize(item.textContent) === target);
        if (!option) return false;
        select.selectedIndex = option.index;
        return true;
    };

    const requestLocations = async (type, id) => {
        const response = await fetch(`/annuncio/amasensLocations?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, {
            credentials: "same-origin",
            cache: "no-cache"
        });
        if (!response.ok) throw new Error(`Amasens ${type} lookup failed (${response.status})`);
        return response.json();
    };

    const loadProvinces = async (regionId) => {
        resetSelect(provinceSelect, "Caricamento...");
        resetSelect(comuneSelect, "Seleziona il Comune...");
        const items = regionId ? await requestLocations("cities", regionId) : [];
        fillSelect(provinceSelect, items, "Seleziona la Provincia...");
        return items;
    };

    const loadComuni = async (provinceId, provinceName) => {
        resetSelect(comuneSelect, "Caricamento...");
        const items = provinceId ? await requestLocations("areas", provinceId) : [];
        fillSelect(comuneSelect, items, "Seleziona il Comune...");

        const capitalName = `${provinceName || ""}`.trim();
        if (provinceId && capitalName) {
            Array.from(comuneSelect.options)
                .filter((option, index) => index > 0 && normalize(option.textContent) === normalize(capitalName))
                .forEach((option) => option.remove());

            const capitalOption = new Option(capitalName, "", true, true);
            capitalOption.dataset.provinceCapital = "true";
            comuneSelect.add(capitalOption, 1);
            comuneSelect.selectedIndex = 1;
        }
        return items;
    };

    resetSelect(regionSelect, "Seleziona la Regione...");
    regions.forEach(([id, name]) => regionSelect.add(new Option(name, id)));

    regionSelect.addEventListener("change", async () => {
        try { await loadProvinces(regionSelect.value); } catch (error) { alert(error.message); }
    });
    provinceSelect.addEventListener("change", async () => {
        try {
            const selectedProvince = provinceSelect.selectedOptions[0];
            await loadComuni(
                selectedProvince?.dataset.locationId || "",
                selectedProvince?.textContent || ""
            );
        } catch (error) { alert(error.message); }
    });

    window.loadAmasensLocationValues = async (province, comune, regionName) => {
        let resolvedRegion = regionName;
        if (!resolvedRegion && province) {
            const result = await requestLocations("resolve", province);
            resolvedRegion = result.region || "";
        }
        if (!selectByName(regionSelect, resolvedRegion)) return false;
        await loadProvinces(regionSelect.value);
        if (!selectByName(provinceSelect, province)) return false;
        const selectedProvince = provinceSelect.selectedOptions[0];
        await loadComuni(
            selectedProvince?.dataset.locationId || "",
            selectedProvince?.textContent || ""
        );
        if (!`${comune || ""}`.trim()) return true;
        return selectByName(comuneSelect, comune);
    };
})();
