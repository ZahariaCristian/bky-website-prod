const getAllowedHistoryStates = (platform, nextState, options = {}) => {
    if (nextState === "DELETE") return ["OK", "CLOSED"];
    if (nextState === "REPUBLISH") {
        return platform === "moscarossa" && options.republishUpgrade
            ? ["CLOSED", "ALERT"]
            : ["CLOSED"];
    }
    return ["OK"];
};

module.exports = { getAllowedHistoryStates };
