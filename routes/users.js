const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");

router.post("/get", authenticateKey, async (req, res) => {
    
    var utenti = await ctx.tblUser.findAll({where:{GCRecord: null}, include:[{
        model: ctx.tblUserRole, required: true, include:[{
            model: ctx.tblRole, required: true
        }]}]});

    res.json({users: utenti});
});

module.exports = router;