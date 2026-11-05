const extractBakecaincontriiRemoteId = (value) => {
    const match = `${value || ""}`.match(/\/u\/(?:post-manage|post-update)\/(it[a-z0-9]+)(?:\/|\?|#|$)/i);
    return match ? match[1] : "";
};

module.exports = { extractBakecaincontriiRemoteId };
