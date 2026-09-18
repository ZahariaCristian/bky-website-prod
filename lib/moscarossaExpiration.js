function moscarossaExpirationTimestamp(schedule) {
    // remoteExpiresAt is the selected promotion countdown. An expired
    // Premium/Top/Red/Gold placement does not mean the ad itself is offline.
    const remoteTimestamp = Number(schedule?.adExpiresAt);
    if (Number.isFinite(remoteTimestamp) && remoteTimestamp > 0) return remoteTimestamp;
    return null;
}

function isMoscarossaExpired(schedule, now = Date.now()) {
    const expiresAt = moscarossaExpirationTimestamp(schedule);
    return expiresAt !== null && expiresAt <= now;
}

module.exports = { moscarossaExpirationTimestamp, isMoscarossaExpired };
