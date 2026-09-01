const MOSCAROSSA_PLATFORM = "moscarossa";

const MOSCAROSSA_PROMOTION_PRICES = {
    premium: { 1: 18, 2: 28, 3: 36, 4: 46, 5: 54, 6: 63, 7: 72, 10: 90, 15: 108, 20: 144, 25: 164, 30: 180 },
    top: { 1: 20, 2: 33, 3: 45, 4: 58, 5: 70, 6: 83, 7: 95, 10: 125, 15: 165, 20: 220, 25: 260, 30: 300 },
    red: { 1: 25, 2: 43, 3: 60, 4: 78, 5: 95, 6: 113, 7: 130, 10: 175, 15: 240, 20: 320, 25: 385, 30: 450 },
    gold: { 1: 37, 2: 67, 3: 95, 4: 125, 5: 154, 6: 183, 7: 212, 10: 292, 15: 415, 20: 554, 25: 677, 30: 800 }
};

const MOSCAROSSA_ADDON_PRICES = {
    vetrina: 8,
    diamond: 50
};

const createPriceRow = (product, days, price, optionsJson = {}) => ({
    platform: MOSCAROSSA_PLATFORM,
    product,
    days: Number(days),
    variantKey: "default",
    optionsJson,
    price: Number(price),
    standardPrice: null,
    active: true
});

function getDefaultMoscarossaPrices() {
    const rows = [];

    Object.entries(MOSCAROSSA_PROMOTION_PRICES).forEach(([product, prices]) => {
        Object.entries(prices).forEach(([days, price]) => {
            rows.push(createPriceRow(product, days, price));
        });
    });

    Object.entries(MOSCAROSSA_ADDON_PRICES).forEach(([product, price]) => {
        rows.push(createPriceRow(product, 1, price, { billing: "per-day" }));
    });

    return rows;
}

module.exports = {
    MOSCAROSSA_PLATFORM,
    MOSCAROSSA_PROMOTION_PRICES,
    MOSCAROSSA_ADDON_PRICES,
    getDefaultMoscarossaPrices
};
