const IMAGE_LIMITS = Object.freeze({ free: 5, premium: 10, top: 10, red: 15, gold: 20 });

function moscarossaImageLimit(schedule) {
    let details = {};
    try {
        const period = typeof schedule.period === "string" ? JSON.parse(schedule.period || "{}") : schedule.period;
        details = period?.moscarossa || period || {};
    } catch (_) {}
    const stored = `${schedule.typeAnnuncio || "Free"}`.trim().toLowerCase();
    const plan = stored !== "free" ? stored : `${details.plan || "Free"}`.trim().toLowerCase();
    return IMAGE_LIMITS[plan] || IMAGE_LIMITS.free;
}

function selectMoscarossaImages(imageIds, previewGalleryId, limit) {
    const preview = `${previewGalleryId || ""}`;
    const ordered = preview && imageIds.some((id) => `${id}` === preview)
        ? [preview, ...imageIds]
        : imageIds;
    const ids = [...new Set(ordered.map((id) => `${id}`))].slice(0, limit);
    return ids.map((id, index) => ({ galleria: Number(id), isAnteprima: index === 0 }));
}

function needsMoscarossaGallerySync(previousIds, requestedIds, explicitlyChanged = false) {
    if (explicitlyChanged) return true;
    const previous = previousIds.map(String).sort();
    const requested = requestedIds.map(String).sort();
    return previous.length !== requested.length ||
        previous.some((id, index) => id !== requested[index]);
}

module.exports = { moscarossaImageLimit, selectMoscarossaImages, needsMoscarossaGallerySync };
