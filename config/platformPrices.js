function getPlatformPriceKey(row = {}) {
    return [
        `${row.platform || ""}`.toLowerCase(),
        `${row.product || ""}`.toLowerCase(),
        Number(row.days || 0),
        `${row.variantKey || "default"}`
    ].join("|");
}

module.exports = {
    getPlatformPriceKey
};
