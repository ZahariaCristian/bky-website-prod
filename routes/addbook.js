const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");

router.post("/get", authenticateKey, async (req, res) => {
    var row= await ctx.tblDonne.findOne({where: {
        id: req.body.id
    },
    include: [{
        model: ctx.tblGalleria,
        where:{
            GCRecord: null
        }
    },
    {
        model: ctx.tblStoricoPagamenti
    },
    {
        model: ctx.tblAnnunci,
        where: {GCRecord: null},
        include: [{
            model: ctx.tblSchedulazioni,
            where: {GCRecord: null},
        }]
    }]
    });
    res.json(row);
});

router.post("/getClients", authenticateKey, async (req, res) => {
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    var rows = await ctx.tblDonne.findAll({where: {
        groupOwner: groupM.id,
        GCRecord: null
    },
    order: [["name", "ASC"]],
    include: [{
        model: ctx.tblGalleria,
        where:{
            GCRecord: null
        }
    }]
    });
    res.json({rows: rows});
});

router.post("/deleteClient", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);

    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    
var cliente = await ctx.tblDonne.findOne({where:{id: req.body.id}});

if (cliente)
{
    await cliente.update({GCRecord: ctx.newGCRecord()});
}else{
    res.sendStatus(400);
}
res.sendStatus(200);
});

module.exports = router;