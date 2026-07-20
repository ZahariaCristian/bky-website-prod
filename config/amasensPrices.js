const AMASENS_PLATFORM = "amasens";

const TOPLIST_STANDARD_SLOT = "standard";
const TOPLIST_STANDARD_SLOT_LABEL = "08:00-12:00 / 12:00-16:00 / 16:00-20:00";

const TOPLIST_PRICES = {
    1: {
        standard: { 1: 6, 2: 9, 3: 11 },
        fullDay: 11,
        night: 7
    },
    3: {
        standard: { 1: 16, 2: 24, 3: 31 },
        fullDay: 31,
        night: 19
    },
    7: {
        standard: { 1: 34, 2: 54, 3: 69 },
        fullDay: 69,
        night: 38
    },
    14: {
        standard: { 1: 62, 2: 100, 3: 131 },
        fullDay: 131,
        night: 62
    },
    30: {
        standard: { 1: 113, 2: 181, 3: 256 },
        fullDay: 256,
        night: 125
    }
};

const createPriceRow = (days, timeSlot, risalite, price) => ({
    platform: AMASENS_PLATFORM,
    product: "toplist",
    days: Number(days),
    variantKey: `${timeSlot}-r${risalite}`,
    optionsJson: {
        timeSlot,
        risalite: Number(risalite)
    },
    price: Number(price),
    standardPrice: null,
    active: true
});

function getDefaultAmasensPrices() {
    const rows = [];

    Object.entries(TOPLIST_PRICES).forEach(([days, prices]) => {
        Object.entries(prices.standard).forEach(([risalite, price]) => {
            rows.push(createPriceRow(days, TOPLIST_STANDARD_SLOT, risalite, price));
        });
        rows.push(createPriceRow(days, "08-20", 3, prices.fullDay));
        rows.push(createPriceRow(days, "20-08", 3, prices.night));
    });

    return rows;
}

module.exports = {
    AMASENS_PLATFORM,
    TOPLIST_STANDARD_SLOT,
    TOPLIST_STANDARD_SLOT_LABEL,
    getDefaultAmasensPrices
};
