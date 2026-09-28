const BAKECAINCONTRII_PLATFORM = "bakecaincontrii";

const BAKECAINCONTRII_PRODUCTS = {
    flash: {
        label: "Flash",
        credits: 45,
        price: 45
    }
};

function getDefaultBakecaincontriiPrices() {
    return Object.entries(BAKECAINCONTRII_PRODUCTS).map(([product, settings]) => ({
        platform: BAKECAINCONTRII_PLATFORM,
        product,
        days: 1,
        variantKey: "default",
        optionsJson: { credits: Number(settings.credits) },
        price: Number(settings.price),
        standardPrice: null,
        active: true
    }));
}

module.exports = {
    BAKECAINCONTRII_PLATFORM,
    BAKECAINCONTRII_PRODUCTS,
    getDefaultBakecaincontriiPrices
};
