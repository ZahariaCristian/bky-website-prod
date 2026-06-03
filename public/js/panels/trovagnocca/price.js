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

const TROVAGNOCCA_TURBO_SLOT_LABELS = {
    307: "Turbo 1 Ora",
    308: "Turbo 2 Ore"
};

const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
};

let trovagnoccaPriceCalculateTimer = null;
let trovagnoccaPriceIsCalculating = false;

const isTrovagnoccaPriceDetailsVisible = () => {
    const details = document.querySelector("#trovagnoccaPriceDetails");
    return Boolean(details && details.style.display !== "none");
};

const setTrovagnoccaPriceDetailsVisible = (visible) => {
    const details = document.querySelector("#trovagnoccaPriceDetails");
    const button = document.querySelector("#btnToggleTrovagnoccaPrice");
    if (!details || !button) return;

    details.style.display = visible ? "" : "none";
    button.innerHTML = visible
        ? "<i class='fa fa-eye-slash'></i> Nascondi calcolo prezzo"
        : "<i class='fa fa-eye'></i> Mostra calcolo prezzo";
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
    if (promoType.includes("turbo")) return 1;
    if (promoType.includes("1x7")) return 7;
    if (promoType.includes("1x3")) return 3;
    if (promoType.includes("1x1")) return 1;

    const promoPanel = panel.closest(".promoPanel");
    if (promoPanel?.classList.contains("promoTurbo")) return 1;
    if (promoPanel?.classList.contains("promo1x7")) return 7;
    if (promoPanel?.classList.contains("promo1x3")) return 3;
    if (promoPanel?.classList.contains("promo1x1")) return 1;

    return 1;
};

const getTrovagnoccaPromoType = (panel) => {
    if (panel.dataset.promoType) return panel.dataset.promoType;

    const promoPanel = panel.closest(".promoPanel");
    if (promoPanel?.classList.contains("promoTurbo")) return "Turbo";
    if (promoPanel?.classList.contains("promo1x7")) return "1x7";
    if (promoPanel?.classList.contains("promo1x3")) return "1x3";
    if (promoPanel?.classList.contains("promo1x1")) return "1x1";
    if (promoPanel?.classList.contains("promoFree")) return "Free";
    return "";
};

const getTrovagnoccaTurboDuration = (panel) => {
    const selected = panel.querySelector(".turbo-option-select")?.value;
    const durationId = parseInt(selected, 10);
    if (Number.isFinite(durationId)) return durationId;
    return 307;
};

const getSelectedTrovagnoccaPriceAds = () => {
    return Array.from(document.querySelectorAll(".newpost-panel"))
        .filter((panel) => !isRemovedTrovagnoccaPricePanel(panel))
        .map((panel, index) => {
            const promoType = getTrovagnoccaPromoType(panel);
            const isTurbo = `${promoType || ""}`.toLowerCase() === "turbo";
            if (isTurbo) {
                const durationId = getTrovagnoccaTurboDuration(panel);
                const time = panel.querySelector("input[type='time']")?.value || "";
                return {
                    index: index + 1,
                    panel,
                    time,
                    promoType,
                    productId: 301,
                    days: getTrovagnoccaAdDays(panel),
                    timeSlots: [durationId],
                    slotLabels: [TROVAGNOCCA_TURBO_SLOT_LABELS[durationId] || `Turbo ${durationId}`]
                };
            }

            const slotMap = new Map();
            panel.querySelectorAll(".gold-slot-input:checked").forEach((input) => {
                const slotId = TROVAGNOCCA_PRICE_SLOT_IDS[input.value];
                if (slotId !== undefined) slotMap.set(slotId, input.value);
            });
            const parentTimeSlot = panel.closest(".time-slot");
            const parentSlotLabel = parentTimeSlot?.dataset?.slot || "";
            if (parentSlotLabel) {
                const slotId = TROVAGNOCCA_PRICE_SLOT_IDS[parentSlotLabel];
                if (slotId !== undefined) slotMap.set(slotId, parentSlotLabel);
            }

            const time = panel.querySelector("input[type='time']")?.value || "";
            return {
                index: index + 1,
                panel,
                time,
                promoType,
                productId: 300,
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
            productId: ad.productId || 300,
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
    if (trovagnoccaPriceIsCalculating) return;
    const selectedAds = getSelectedTrovagnoccaPriceAds();
    updateTrovagnoccaSelectedSlotCount();

    if (!selectedAds.length) {
        resetTrovagnoccaPriceResult();
        setTrovagnoccaPriceMessage("Seleziona almeno una fascia Top in almeno un annuncio prima di calcolare il prezzo.", true);
        return;
    }

    trovagnoccaPriceIsCalculating = true;
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
        trovagnoccaPriceIsCalculating = false;
        setTrovagnoccaPriceLoading(false);
    }
};

const scheduleTrovagnoccaPriceCalculation = () => {
    updateTrovagnoccaSelectedSlotCount();

    clearTimeout(trovagnoccaPriceCalculateTimer);
    trovagnoccaPriceCalculateTimer = setTimeout(() => {
        calculateTrovagnoccaPrice();
    }, 400);
};

const observeTrovagnoccaScheduleChanges = () => {
    const promoContainer = document.querySelector(".promo");
    if (!promoContainer || !window.MutationObserver) return;

    const observer = new MutationObserver((mutations) => {
        const hasScheduleChange = mutations.some((mutation) => {
            if (mutation.type === "childList") {
                return Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes))
                    .some((node) => node.nodeType === 1 && (
                        node.matches?.(".newpost-panel, .newpost-wrapper, .time-slot") ||
                        node.querySelector?.(".newpost-panel, .newpost-wrapper, .time-slot")
                    ));
            }

            if (mutation.type === "attributes") {
                return mutation.target?.classList?.contains("newpost-panel") ||
                    mutation.target?.classList?.contains("time-slot");
            }

            return false;
        });

        if (hasScheduleChange) scheduleTrovagnoccaPriceCalculation();
    });

    observer.observe(promoContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "data-GCRecord", "data-state", "data-promo-type"]
    });
};

document.querySelector("#btnToggleTrovagnoccaPrice")?.addEventListener("click", () => {
    const nextVisible = !isTrovagnoccaPriceDetailsVisible();
    setTrovagnoccaPriceDetailsVisible(nextVisible);
    if (nextVisible) {
        scheduleTrovagnoccaPriceCalculation();
    }
});
document.addEventListener("change", (event) => {
    if (
        event.target?.classList?.contains("gold-slot-input") ||
        event.target?.closest?.(".time-slot > .flex-checkbox") ||
        event.target?.closest?.(".newpost-panel")
    ) {
        scheduleTrovagnoccaPriceCalculation();
    }
});

document.addEventListener("click", (event) => {
    if (event.target?.closest?.(".newpost-panel .btn-danger, .promoPanel .top-add-schedule, .promoPanel .free-add-schedule, .promoPanel .turbo-add-schedule")) {
        setTimeout(scheduleTrovagnoccaPriceCalculation, 0);
    }
});

resetTrovagnoccaPriceResult();
updateTrovagnoccaSelectedSlotCount();
setTrovagnoccaPriceDetailsVisible(false);
observeTrovagnoccaScheduleChanges();
