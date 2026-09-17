const PAID_PLANS = new Set(["premium", "top", "red", "gold"]);
const DURATIONS = new Set([1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 25, 30]);

function moscarossaExpirationTimestamp(schedule) {
    const remoteTimestamp = Number(schedule?.remoteExpiresAt);
    if (Number.isFinite(remoteTimestamp) && remoteTimestamp > 0) return remoteTimestamp;

    const publishedAt = new Date(schedule?.data).getTime();
    if (!Number.isFinite(publishedAt)) return null;

    let details = {};
    try {
        const period = typeof schedule?.period === "string"
            ? JSON.parse(schedule.period || "{}")
            : (schedule?.period || {});
        details = period.moscarossa || period;
    } catch (_) {}
    const storedPlan = `${schedule?.typeAnnuncio || "Free"}`.trim().toLowerCase();
    const plan = storedPlan !== "free" ? storedPlan : `${details.plan || "Free"}`.trim().toLowerCase();
    const requestedDays = Number.parseInt(details.days || details.duration || 1, 10);
    const days = PAID_PLANS.has(plan) && DURATIONS.has(requestedDays) ? requestedDays : 1;
    return publishedAt + days * 86400000;
}

function isMoscarossaExpired(schedule, now = Date.now()) {
    const expiresAt = moscarossaExpirationTimestamp(schedule);
    return expiresAt !== null && expiresAt <= now;
}

module.exports = { moscarossaExpirationTimestamp, isMoscarossaExpired };
