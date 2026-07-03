const TOPLIST_STANDARD_SLOT = "standard";
const TOPLIST_STANDARD_SLOT_LABEL = "08:00-12:00 / 12:00-16:00 / 16:00-20:00";
const INCONTRIAMOCI_PLATFORM = "incontriamoci";
const { getPlatformPriceKey } = require("./platformPrices");

const VETRINA_PRICES = {
    1: [7, 13],
    2: [13, 24],
    3: [19, 35],
    4: [25, 46],
    5: [31, 57],
    6: [38, 69],
    7: [44, 80],
    8: [50, 91],
    9: [56, 102],
    10: [63, 114],
    11: [69, 125],
    12: [75, 136],
    13: [82, 149],
    14: [87, 159],
    15: [94, 170],
    30: [182, 331]
};

const TOPLIST_PRICES = {
    1: {
        standard: { 1: [3, 6], 2: [5, 9], 3: [6, 11] },
        fullDay: [6, 11],
        night: [4, 7]
    },
    3: {
        standard: { 1: [9, 16], 2: [13, 24], 3: [17, 31] },
        fullDay: [17, 31],
        night: [10, 19]
    },
    7: {
        standard: { 1: [19, 34], 2: [30, 54], 3: [38, 69] },
        fullDay: [38, 69],
        night: [21, 38]
    },
    14: {
        standard: { 1: [34, 62], 2: [55, 100], 3: [72, 131] },
        fullDay: [72, 131],
        night: [34, 62]
    },
    30: {
        standard: { 1: [62, 113], 2: [100, 181], 3: [141, 256] },
        fullDay: [141, 256],
        night: [69, 125]
    }
};

const createPriceRow = (product, days, timeSlot, risalite, prices) => {
    const isVetrina = product === "vetrina";
    return {
        platform: INCONTRIAMOCI_PLATFORM,
        product,
        days: Number(days),
        variantKey: isVetrina ? "default" : `${timeSlot}-r${risalite}`,
        optionsJson: isVetrina ? {} : {
            timeSlot,
            risalite: Number(risalite)
        },
        price: Number(prices[0]),
        standardPrice: Number(prices[1]),
        active: true
    };
};

function getDefaultIncontriamociPrices() {
    const rows = [];

    Object.entries(VETRINA_PRICES).forEach(([days, prices]) => {
        rows.push(createPriceRow("vetrina", days, "", 0, prices));
    });

    Object.entries(TOPLIST_PRICES).forEach(([days, prices]) => {
        Object.entries(prices.standard).forEach(([risalite, values]) => {
            rows.push(createPriceRow("toplist", days, TOPLIST_STANDARD_SLOT, risalite, values));
        });
        rows.push(createPriceRow("toplist", days, "08-20", 3, prices.fullDay));
        rows.push(createPriceRow("toplist", days, "20-08", 3, prices.night));
    });

    return rows;
}

module.exports = {
    INCONTRIAMOCI_PLATFORM,
    TOPLIST_STANDARD_SLOT,
    TOPLIST_STANDARD_SLOT_LABEL,
    getDefaultIncontriamociPrices
};
