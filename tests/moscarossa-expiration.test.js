const assert = require("node:assert/strict");
const { test } = require("node:test");
const { moscarossaExpirationTimestamp, isMoscarossaExpired } = require("../lib/moscarossaExpiration");

test("prefers the Moscarossa expiration over the scheduled estimate", () => {
    const schedule = {
        data: "2026-09-16T09:00:00.000Z",
        period: JSON.stringify({ moscarossa: { plan: "Top", days: 3 } }),
        typeAnnuncio: "Top",
        remoteExpiresAt: "1789635720000"
    };
    assert.equal(moscarossaExpirationTimestamp(schedule), 1789635720000);
    assert.equal(isMoscarossaExpired(schedule, 1789635720000), true);
    assert.equal(isMoscarossaExpired(schedule, 1789635719999), false);
});

test("matches the displayed duration estimate when remote expiration is unavailable", () => {
    const start = Date.parse("2026-09-16T09:00:00.000Z");
    assert.equal(moscarossaExpirationTimestamp({
        data: new Date(start), typeAnnuncio: "Top",
        period: JSON.stringify({ moscarossa: { plan: "Top", days: 3 } })
    }), start + 3 * 86400000);
    assert.equal(moscarossaExpirationTimestamp({ data: new Date(start), typeAnnuncio: "Free" }),
        start + 86400000);
    assert.equal(moscarossaExpirationTimestamp({ typeAnnuncio: "Top" }), null);
});
