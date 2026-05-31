const router = require("express").Router();
const logger = require("../lib/logger");
const { authenticateKey } = require("../lib/authentication");

router.post("/logs", authenticateKey, (req, res) => {
    res.json({logs: logger.ReadLines()});
});

module.exports = router;