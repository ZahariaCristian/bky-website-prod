const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const Mailer = require("../lib/mailer");

router.post("/getGroup", authenticateKey, async (req, res) => {
    var me = await ctx.tblUser.findOne({
        where:{
            OID: req.session.userid
        }
    });
    var member = await me.getGroup();
    var groupID = member.group;
    var members = await ctx.tblMembriGruppo.findAll({where: {GCRecord: null, group: groupID}});
    var users = new Array;
    for (const item of members){
        var user = await item.getTblUser();
        var sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        var annunci = await user.getTblAnnuncis({where: {createdAt: {$gt: sevenDaysAgo}}});
        user.annunci = annunci.length;
        if(user.OID == me.OID){
            user.isMe = true;
        }else{
            user.isMe = false;
        }
        user.storedPassword = "";
        user.password = "";
        users.push(user);
    }
    res.json({Users: users});
});

router.post("/invite", authenticateKey, async (req, res) => {
    var mail = req.body.mailTo;
    var user = await ctx.tblUser.findOne({where: {mail: mail}});
    if(!user){
        res.sendStatus(404);
        res.end();
    }else{
        var me = await ctx.tblUser.findOne({
            where:{
                OID: req.session.userid
            }
        });
        var member = await me.getGroup();
        var groupID = member.group;
        var secret = require('crypto').randomBytes(64).toString('hex');
        ctx.tblInvitiGruppo.create({
            user: user.OID,
            group: groupID,
            secret: secret
        }).then(function(){
            
            var newMail = new Mailer(mail, "BKY: Sei stato invitato a unirti ad un gruppo di lavoro");
            newMail.Send(`
            <body>
                <h1>BKY</h1>
                <p>&nbsp;</p>
                <p>Cliccando sul seguente link acconsenti ad unirti al gruppo di lavoro di ${me.userName}</p>
                <p>&nbsp;</p>
                <p>Inoltre, condividerai tutti i tuoi annunci già pianificati. Tutti gli annunci già pianificati useranno i crediti dell'amministratore del gruppo.</p>
                <p>&nbsp;</p>
                <a href="${req.protocol}://${req.hostname}/team/acceptInvite?s=${secret}">Clicca Qui</a>
            </body>
            `);
    
            res.sendStatus(200);
        }).catch(function(err){
            res.send(err);
        });
    }
});

router.use("/acceptInvite",async (req, res) => {
    var inv = await ctx.tblInvitiGruppo.findOne({where: {secret: req.query.s, GCRecord: null}});
    if(!inv){
        res.sendStatus(404);
    }else{
        let user = await ctx.tblUser.findOne({where: {OID: inv.user}});
        let group = await user.getGroup();
        await group.update({
            group: inv.group,
            owner: 0
        });
        inv.update({GCRecord: ctx.newGCRecord()});
        res.sendStatus(200);
    }
});

router.post("/delete", authenticateKey, async (req, res) => {
    var me = await ctx.tblUser.findOne({
        where:{
            OID: req.session.userid
        }
    });
    var tblmember = await me.getGroup();
    if(tblmember.owner == 1){
        let memberID = req.body.targetID;
        var target = await ctx.tblUser.findOne({
            where:{
                OID: memberID
            }
        });
        var originGroup = await ctx.tblGruppi.findOne({where: {owner: memberID}});
        if(originGroup){
            var tblMemberTarget = await target.getGroup();
            tblMemberTarget.update({
                group: originGroup.id,
                owner: 1
            });
            res.sendStatus(200);
        }else{
            res.sendStatus(404);
        }        
    }else{
        res.sendStatus(401);
    }
});

module.exports = router;
