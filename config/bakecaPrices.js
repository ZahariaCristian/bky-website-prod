const BAKECA_PLATFORM = "bakeca";

const BAKECA_PRODUCTS = {
    toplist1: {
        label: "Top List1",
        timeSlots: [
            "09:00-12:00",
            "12:00-14:00",
            "14:00-16:00",
            "16:00-18:00",
            "18:00-21:00",
            "21:00-00:00",
            "00:00-09:00"
        ],
        durations: {
            1: { credits: 7, price: 7 },
            3: { credits: 14, price: 14 },
            7: { credits: 24, price: 24 },
            14: { credits: 42, price: 42 },
            28: { credits: 78, price: 78 }
        }
    },
    toplist3: {
        label: "Top List3",
        timeSlots: [
            "09:00-18:00",
            "10:00-16:00",
            "14:00-20:00",
            "18:00-23:00",
            "23:00-09:00"
        ],
        durations: {
            1: { credits: 18, price: 18 },
            3: { credits: 33, price: 33 },
            7: { credits: 62, price: 62 },
            14: { credits: 111, price: 111 },
            28: { credits: 197, price: 197 }
        }
    }
};

function getDefaultBakecaPrices() {
    const rows = [];

    Object.entries(BAKECA_PRODUCTS).forEach(([product, settings]) => {
        Object.entries(settings.durations).forEach(([days, values]) => {
            rows.push({
                platform: BAKECA_PLATFORM,
                product,
                days: Number(days),
                variantKey: "default",
                optionsJson: {},
                price: Number(values.price),
                standardPrice: null,
                active: true
            });
        });
    });

    return rows;
}

module.exports = {
    BAKECA_PLATFORM,
    BAKECA_PRODUCTS,
    getDefaultBakecaPrices
};
