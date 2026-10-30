const BAKECAINCONTRII_PLATFORM = "bakecaincontrii";
const BAKECAINCONTRII_EURO_PER_CREDIT = 0.33;

const BAKECAINCONTRII_PRODUCTS = {
    flash: {
        label: "Flash",
        credits: 45,
        price: 45
    }
};

const BAKECAINCONTRII_TOP_PRICES = [
    {
        variantKey: "daytime-full",
        label: "Mattina / pomeriggio / sera completa",
        days: 1,
        baseCredits: 140,
        superTopCredits: 45,
        backgroundCredits: 14,
        labelCredits: 14
    },
    {
        variantKey: "daytime-hourly",
        label: "Mattina / pomeriggio / sera - fascia oraria",
        days: 1,
        baseCredits: 30,
        superTopCredits: 10,
        backgroundCredits: 3,
        labelCredits: 3
    },
    {
        variantKey: "daytime-hourly",
        label: "Mattina / pomeriggio / sera - fascia oraria",
        days: 3,
        baseCredits: 62,
        superTopCredits: 21,
        backgroundCredits: 6,
        labelCredits: 6
    },
    {
        variantKey: "daytime-hourly",
        label: "Mattina / pomeriggio / sera - fascia oraria",
        days: 7,
        baseCredits: 124,
        superTopCredits: 41,
        backgroundCredits: 12,
        labelCredits: 12
    },
    {
        variantKey: "night",
        label: "Notte 00:00 - 06:00",
        days: 1,
        baseCredits: 45,
        superTopCredits: 14,
        backgroundCredits: 4,
        labelCredits: 4
    },
    {
        variantKey: "night",
        label: "Notte 00:00 - 06:00",
        days: 3,
        baseCredits: 90,
        superTopCredits: 28,
        backgroundCredits: 8,
        labelCredits: 8
    },
    {
        variantKey: "night",
        label: "Notte 00:00 - 06:00",
        days: 7,
        baseCredits: 180,
        superTopCredits: 55,
        backgroundCredits: 16,
        labelCredits: 16
    }
];

function getDefaultBakecaincontriiPrices() {
    const productRows = Object.entries(BAKECAINCONTRII_PRODUCTS).map(([product, settings]) => ({
        platform: BAKECAINCONTRII_PLATFORM,
        product,
        days: 1,
        variantKey: "default",
        optionsJson: {
            credits: Number(settings.credits),
            unit: "credits",
            euroPerCredit: BAKECAINCONTRII_EURO_PER_CREDIT
        },
        price: Number(settings.price),
        standardPrice: null,
        active: true
    }));

    const topRows = BAKECAINCONTRII_TOP_PRICES.map((settings) => ({
        platform: BAKECAINCONTRII_PLATFORM,
        product: "top",
        days: Number(settings.days),
        variantKey: settings.variantKey,
        optionsJson: {
            label: settings.label,
            unit: "credits",
            euroPerCredit: BAKECAINCONTRII_EURO_PER_CREDIT,
            superTopCredits: Number(settings.superTopCredits),
            backgroundCredits: Number(settings.backgroundCredits),
            labelCredits: Number(settings.labelCredits)
        },
        price: Number(settings.baseCredits),
        standardPrice: null,
        active: true
    }));

    return [...productRows, ...topRows];
}

module.exports = {
    BAKECAINCONTRII_PLATFORM,
    BAKECAINCONTRII_EURO_PER_CREDIT,
    BAKECAINCONTRII_PRODUCTS,
    BAKECAINCONTRII_TOP_PRICES,
    getDefaultBakecaincontriiPrices
};
