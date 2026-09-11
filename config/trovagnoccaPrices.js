const TROVAGNOCCA_PLATFORM = "trovagnocca";

const TROVAGNOCCA_TOP_DAYS = [1, 3, 7];
const TROVAGNOCCA_TOP_SLOTS = [
    { id: 300, label: "00:00-06:00" },
    { id: 301, label: "06:00-09:00" },
    { id: 302, label: "09:00-12:00" },
    { id: 303, label: "12:00-15:00" },
    { id: 304, label: "15:00-18:00" },
    { id: 305, label: "18:00-21:00" },
    { id: 306, label: "21:00-00:00" }
];
const TROVAGNOCCA_TURBO_DURATIONS = [
    { id: 307, label: "Turbo 1 Ora" },
    { id: 308, label: "Turbo 2 Ore" }
];

const createDefinition = (product, days, slot, productId) => ({
    platform: TROVAGNOCCA_PLATFORM,
    product,
    days,
    variantKey: `${product === "top" ? "slot" : "duration"}-${slot.id}`,
    optionsJson: {
        productId,
        timeSlotId: slot.id,
        label: slot.label
    },
    active: true
});

function getTrovagnoccaPriceDefinitions() {
    const topRows = TROVAGNOCCA_TOP_DAYS.flatMap((days) =>
        TROVAGNOCCA_TOP_SLOTS.map((slot) => createDefinition("top", days, slot, 300))
    );
    const turboRows = TROVAGNOCCA_TURBO_DURATIONS.map((slot) =>
        createDefinition("turbo", 1, slot, 301)
    );

    return [...topRows, ...turboRows];
}

module.exports = {
    TROVAGNOCCA_PLATFORM,
    TROVAGNOCCA_TOP_DAYS,
    TROVAGNOCCA_TOP_SLOTS,
    TROVAGNOCCA_TURBO_DURATIONS,
    getTrovagnoccaPriceDefinitions
};
