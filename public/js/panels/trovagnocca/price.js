const TROVAGNOCCA_PRICE_SLOT_IDS = {
    "00:00-06:00": 300,
    "06:00-09:00": 301,
    "09:00-12:00": 302,
    "12:00-15:00": 303,
    "15:00-18:00": 304,
    "18:00-21:00": 305,
    "21:00-00:00": 306
};

const TROVAGNOCCA_PRICE_SLOT_LABELS = Object.entries(TROVAGNOCCA_PRICE_SLOT_IDS)
    .reduce((labels, [label, id]) => {
        labels[id] = label;
        return labels;
    }, {});

const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
};

const formatEuroCents = (cents) => {
    const value = Number(cents || 0) / 100;
    return `${value.toFixed(2).replace(".", ",")} €`;
};

const getTrovagnoccaCsrfToken = () => {
    const storageKeys = [
        "trovagnoccaCsrfToken",
        "trovagnocca_csrf_token",
        "csrfToken",
        "csrf_token",
        "x-csrf-token"
    ];
    const candidates = [
        window.TROVAGNOCCA_CSRF_TOKEN,
        document.querySelector("meta[name='csrf-token']")?.content,
        document.querySelector("meta[name='x-csrf-token']")?.content,
        document.querySelector("input[name='csrfToken']")?.value,
        document.querySelector("input[name='_csrf']")?.value,
        ...storageKeys.map((key) => localStorage.getItem(key)),
        ...storageKeys.map((key) => sessionStorage.getItem(key))
    ];

    return candidates.find((value) => `${value || ""}`.trim()) || "";
};

const setTrovagnoccaPriceMessage = (message, isError) => {
    const messageEl = document.querySelector("#trovagnoccaPriceMessage");
    if (!messageEl) return;
    messageEl.textContent = message || "";
    messageEl.classList.toggle("text-danger", Boolean(isError));
    messageEl.classList.toggle("text-muted", !isError);
};

const setTrovagnoccaPriceLoading = (loading) => {
    const button = document.querySelector("#btnCalculateTrovagnoccaPrice");
    if (!button) return;
    button.disabled = loading;
    button.innerHTML = loading
        ? "<i class='fa fa-spinner fa-spin'></i> Calcolo..."
        : "<i class='fa fa-calculator'></i> Calcola prezzo";
};

const resetTrovagnoccaPriceResult = () => {
    setText("#trovagnoccaTotalBasePrice", "-");
    setText("#trovagnoccaTotalBaseCredits", "-");
    setText("#trovagnoccaTotalCredits", "-");
    setText("#trovagnoccaTotalFinalPrice", "-");
    setText("#totalCost", "0 €");
    setText("#totalCredits", "0");

    const rows = document.querySelector("#trovagnoccaPriceRows");
    if (rows) {
        rows.innerHTML = `<tr><td colspan="7" class="text-muted">Nessuna fascia calcolata</td></tr>`;
    }
};

const updateTrovagnoccaSelectedSlotCount = () => {
    const selectedAds = getSelectedTrovagnoccaPriceAds();
    const selectedSlots = selectedAds.reduce((sum, ad) => sum + ad.timeSlots.length, 0);
    setText("#trovagnoccaSelectedSlots", `${selectedAds.length} / ${selectedSlots}`);
};

const isRemovedTrovagnoccaPricePanel = (panel) => {
    return panel.style.display === "none" || Boolean($(panel).data("GCRecord"));
};

const getTrovagnoccaAdDays = (panel) => {
    const promoType = `${panel.dataset.promoType || ""}`.toLowerCase();
    if (promoType.includes("1x7")) return 7;
    if (promoType.includes("1x3")) return 3;
    if (promoType.includes("1x1")) return 1;

    const promoPanel = panel.closest(".promoPanel");
    if (promoPanel?.classList.contains("promo1x7")) return 7;
    if (promoPanel?.classList.contains("promo1x3")) return 3;
    if (promoPanel?.classList.contains("promo1x1")) return 1;

    return 1;
};

const getSelectedTrovagnoccaPriceAds = () => {
    return Array.from(document.querySelectorAll(".newpost-panel"))
        .filter((panel) => !isRemovedTrovagnoccaPricePanel(panel))
        .map((panel, index) => {
            const slotMap = new Map();
            panel.querySelectorAll(".gold-slot-input:checked").forEach((input) => {
                const slotId = TROVAGNOCCA_PRICE_SLOT_IDS[input.value];
                if (slotId !== undefined) slotMap.set(slotId, input.value);
            });

            const time = panel.querySelector("input[type='time']")?.value || "";
            return {
                index: index + 1,
                panel,
                time,
                promoType: panel.dataset.promoType || "",
                days: getTrovagnoccaAdDays(panel),
                timeSlots: Array.from(slotMap.keys()).sort((a, b) => a - b),
                slotLabels: Array.from(slotMap.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([, label]) => label)
            };
        })
        .filter((ad) => ad.timeSlots.length);
};

const fetchTrovagnoccaAdPrice = async (ad) => {
    const response = await fetch("/annuncio/trovagnoccaPrice", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({
            key: localStorage.getItem("key"),
            csrfToken: getTrovagnoccaCsrfToken(),
            numberDays: ad.days,
            timeSlots: ad.timeSlots
        }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        const details = typeof data.details === "string"
            ? data.details
            : (data.details ? JSON.stringify(data.details) : "");
        throw new Error(details || data.error || "Prezzo non disponibile.");
    }

    return { ad, data };
};

const getFinalPrice = (price) => price.discount || price.base || {};

const renderTrovagnoccaPriceRows = (pricedAds) => {
    const rows = document.querySelector("#trovagnoccaPriceRows");
    if (!rows) return;

    rows.innerHTML = "";
    pricedAds.forEach(({ ad, data }, displayIndex) => {
        const price = data?.data?.price || {};
        const finalPrice = getFinalPrice(price);
        const row = document.createElement("tr");
        const timeText = ad.time ? ` - ${ad.time}` : "";
        const promoText = ad.promoType ? ` ${ad.promoType}` : "";
        row.innerHTML = `
            <td>
                <strong>Ads ${displayIndex + 1}${promoText}${timeText}</strong><br>
                <span class="text-muted">${ad.slotLabels.join(", ")}</span>
            </td>
            <td>${ad.days}</td>
            <td>${price.base?.coin || "-"}</td>
            <td>${price.base?.credits ?? "-"}</td>
            <td>${price.discount?.credits ?? "-"}</td>
            <td>${price.discount?.coin || "-"}</td>
            <td>${price.discount?.percentage || "0%"}</td>
        `;
        rows.appendChild(row);
    });
};

const renderTrovagnoccaPriceTotals = (pricedAds) => {
    const totals = pricedAds.reduce((sum, { data }) => {
        const price = data?.data?.price || {};
        const finalPrice = getFinalPrice(price);

        sum.baseCents += Number(price.base?.cents || 0);
        sum.discountCents += Number(price.discount?.cents || 0);
        sum.finalCents += Number(finalPrice.cents || 0);
        sum.baseCredits += Number(price.base?.credits || 0);
        sum.discountCredits += Number(price.discount?.credits || 0);
        sum.credits += Number(finalPrice.credits || 0);
        return sum;
    }, {
        baseCents: 0,
        discountCents: 0,
        finalCents: 0,
        baseCredits: 0,
        discountCredits: 0,
        credits: 0
    });

    setText("#trovagnoccaTotalBasePrice", formatEuroCents(totals.baseCents));
    setText("#trovagnoccaTotalBaseCredits", `${totals.baseCredits}`);
    setText("#trovagnoccaTotalCredits", `${totals.credits}`);
    setText("#trovagnoccaTotalFinalPrice", formatEuroCents(totals.finalCents));
    setText("#totalCost", formatEuroCents(totals.finalCents));
    setText("#totalCredits", `${totals.credits}`);
};

const updateTrovagnoccaCostTable = (dailyCents) => {
    const costTableBody = document.querySelector("#costTableBody");
    if (!costTableBody) return;

    costTableBody.innerHTML = "";
    for (let days = 1; days <= 10; days++) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${days} giorno${days > 1 ? "i" : ""}</td>
            <td>${formatEuroCents(dailyCents * days)}</td>
        `;
        costTableBody.appendChild(row);
    }
};

const calculateTrovagnoccaPrice = async () => {
    const selectedAds = getSelectedTrovagnoccaPriceAds();
    updateTrovagnoccaSelectedSlotCount();

    if (!selectedAds.length) {
        resetTrovagnoccaPriceResult();
        setTrovagnoccaPriceMessage("Seleziona almeno una fascia Top in almeno un annuncio prima di calcolare il prezzo.", true);
        return;
    }

    setTrovagnoccaPriceLoading(true);
    setTrovagnoccaPriceMessage("");

    try {
        const pricedAds = await Promise.all(
            selectedAds.map((ad) => fetchTrovagnoccaAdPrice(ad))
        );

        renderTrovagnoccaPriceRows(pricedAds);
        renderTrovagnoccaPriceTotals(pricedAds);

        const dailyFinalCents = pricedAds.reduce((sum, { data }) => {
            const price = data?.data?.price || {};
            return sum + Number(getFinalPrice(price).cents || 0);
        }, 0);
        updateTrovagnoccaCostTable(dailyFinalCents);

        const selectedSlotCount = selectedAds.reduce((sum, ad) => sum + ad.timeSlots.length, 0);
        setTrovagnoccaPriceMessage(`Calcolo completato per ${selectedAds.length} annunci e ${selectedSlotCount} fasce.`);
    } catch (error) {
        resetTrovagnoccaPriceResult();
        setTrovagnoccaPriceMessage(error.message || "Errore durante il calcolo del prezzo.", true);
    } finally {
        setTrovagnoccaPriceLoading(false);
    }
};

document.querySelector("#btnCalculateTrovagnoccaPrice")?.addEventListener("click", calculateTrovagnoccaPrice);
document.addEventListener("change", (event) => {
    if (event.target?.classList?.contains("gold-slot-input")) {
        updateTrovagnoccaSelectedSlotCount();
        resetTrovagnoccaPriceResult();
    }
});

resetTrovagnoccaPriceResult();
updateTrovagnoccaSelectedSlotCount();
