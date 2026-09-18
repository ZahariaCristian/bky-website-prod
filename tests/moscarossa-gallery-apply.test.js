const assert = require("node:assert/strict");
const { test } = require("node:test");
const { moscarossaImageLimit, selectMoscarossaImages } = require("../lib/moscarossaGalleryApply");

test("uses the published plan's image limit, including legacy paid schedules", () => {
    assert.equal(moscarossaImageLimit({ typeAnnuncio: "Free" }), 5);
    assert.equal(moscarossaImageLimit({ typeAnnuncio: "Premium" }), 10);
    assert.equal(moscarossaImageLimit({ typeAnnuncio: "Top" }), 10);
    assert.equal(moscarossaImageLimit({ typeAnnuncio: "Red" }), 15);
    assert.equal(moscarossaImageLimit({ typeAnnuncio: "Gold" }), 20);
    assert.equal(moscarossaImageLimit({ typeAnnuncio: "Free",
        period: JSON.stringify({ moscarossa: { plan: "Gold" } }) }), 20);
});

test("keeps the selected preview when the gallery exceeds a Free plan's limit", () => {
    const selected = selectMoscarossaImages([1, 2, 3, 4, 5, 6], 6, 5);
    assert.deepEqual(selected.map((image) => image.galleria), [6, 1, 2, 3, 4]);
    assert.deepEqual(selected.map((image) => image.isAnteprima), [true, false, false, false, false]);
});

test("deduplicates and falls back to the first image when no preview was chosen", () => {
    assert.deepEqual(selectMoscarossaImages([2, 2, 3], "", 5), [
        { galleria: 2, isAnteprima: true }, { galleria: 3, isAnteprima: false }
    ]);
});
