const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");

router.post("/get", authenticateKey, async (req, res) => {
    var rows = await ctx.tblBlackList.findAll({where:{GCRecord: null}});
    res.json({rows: rows});
});

router.post("/update", authenticateKey, async (req, res) => {
    if (!req.body.rows) return res.sendStatus(400);
    var rows = req.body.rows;
    for(row of rows){
        var text = await ctx.tblBlackList.findOne({where:{id: row.id}});
        if(!text){
            row = await ctx.tblBlackList.create({
                text: row.text,
                typeMatch: row.typeMatch,
                target: row.target
            });
        }else{
            if(row.removeThis == 1){
                await ctx.tblBlackList.update({
                    text: row.text,
                    typeMatch: row.typeMatch,
                    target: row.target,
                    GCRecord: ctx.newGCRecord()
                }, {where: {id: row.id}});
            }else{
                row = await ctx.tblBlackList.update({
                    text: row.text,
                    typeMatch: row.typeMatch,
                    target: row.target
                }, {where: {id: row.id}});
            }
        }
    }

    res.json(rows);
});

module.exports = router;