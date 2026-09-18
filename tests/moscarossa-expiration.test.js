const assert = require("node:assert/strict");
const { test } = require("node:test");
const { moscarossaExpirationTimestamp, isMoscarossaExpired } = require("../lib/moscarossaExpiration");

test("uses the Moscarossa advertisement expiration, not the promotion countdown", () => {
    const schedule = {
        data: "2026-09-16T09:00:00.000Z",
        period: JSON.stringify({ moscarossa: { plan: "Top", days: 3 } }),
        typeAnnuncio: "Top",
        remoteExpiresAt: "1789635720000",
        adExpiresAt: "1791439199999"
    };
    assert.equal(moscarossaExpirationTimestamp(schedule), 1791439199999);
    assert.equal(isMoscarossaExpired(schedule, 1791439199999), true);
    assert.equal(isMoscarossaExpired(schedule, 1791439199998), false);
});

test("does not infer ad expiration from a paid promotion or legacy timestamp", () => {
    assert.equal(moscarossaExpirationTimestamp({
        data: new Date("2026-09-16T09:00:00.000Z"), typeAnnuncio: "Top",
        remoteExpiresAt: "1789635720000",
        period: JSON.stringify({ moscarossa: { plan: "Top", days: 3 } })
    }), null);
    assert.equal(isMoscarossaExpired({ remoteExpiresAt: "1" }), false);
});
