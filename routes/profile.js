const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const salt = require("../lib/salt");
const crp = require("crypto");

function encryptPass(pass) {
    let key = crp.scryptSync(process.env.TOKEN_SECRET, "salt", 32);
    const iv = Buffer.alloc(16, 0);
    let cip = crp.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cip.update(pass);
    encrypted = Buffer.concat([encrypted, cip.final()]);
    return encrypted.toString("hex");
}

router.post("/get", authenticateKey, async (req, res) => {
    var userid = req.session.userid;
    var utente = await ctx.tblUser.findOne({where:{GCRecord: null, OID: userid}});
    if(!utente) return res.sendStatus(400);
    var gruppo = await ctx.tblGruppi.findOne({where:{owner: userid}});
    if (gruppo && ctx.tblPlatform) {
        gruppo = gruppo.get({ plain: true });
        const platformInfo = await ctx.tblPlatform.findAll({ where: { gruppi: gruppo.id } });
        platformInfo.map(p => p.get({ plain: true })).forEach((info) => {
            gruppo[info.platform] = info;
        });
    }
    res.json({user: utente, group: gruppo});
});

router.post("/edit", authenticateKey, async (req, res) => {
    if (!req.body.group || !req.body.user) return res.sendStatus(400);
    var userid = req.session.userid;
    var utente = await ctx.tblUser.findOne({where:{GCRecord: null, OID: userid}});
    if(!utente) return res.sendStatus(400);
    var user = req.body.user;
    var group = req.body.group;
    var bakecaGroup = req.body.bakecaGroup;
    var megaescortGroup = req.body.megaescortGroup;
    var trovagnoccaGroup = req.body.trovagnoccaGroup;
    var incontriamociGroup = req.body.incontriamociGroup;
    if(!user.password || user.password.length == 0){
        user.storedPassword = utente.password;
    }else{
        user.storedPassword = await salt.SaltPasswordSync(user.password);
    }
    await utente.update({
        userName: user.userName,
        mail: user.mail,
        isActive: user.isActive,
        forceChangePassword: user.forceChangePassword,
        password: user.storedPassword,
        firstTime: false
    });
    var gruppo = await ctx.tblGruppi.findOne({where:{owner: userid}});
    if(!group.bkPassword || group.bkPassword.length == 0){
        group.bkPassword = gruppo.bkPassword;
    }else{
        group.bkPassword = encryptPass(group.bkPassword);
    }
    await gruppo.update({
        bkUserName: group.bkUserName,
        bkPassword: group.bkPassword
    });

    if (ctx.tblPlatform && bakecaGroup) {
        await upsertPlatform(gruppo.id, "bakeca", bakecaGroup, true);
    }
    if (ctx.tblPlatform && megaescortGroup) {
        await upsertPlatform(gruppo.id, "megaescort", megaescortGroup, false);
    }
    if (ctx.tblPlatform && trovagnoccaGroup) {
        await upsertPlatform(gruppo.id, "trovagnocca", trovagnoccaGroup, true);
    }
    if (ctx.tblPlatform && incontriamociGroup) {
        await upsertPlatform(gruppo.id, "incontriamoci", incontriamociGroup, true);
    }

    res.sendStatus(200);
});

async function upsertPlatform(groupId, platform, data, encryptPassword) {
    let platformInfo = await ctx.tblPlatform.findOne({ where: { gruppi: groupId, platform } });
    let password = platformInfo ? platformInfo.password : "";

    if (encryptPassword && data.password && data.password.length > 0) {
        password = encryptPass(data.password);
    }

    const payload = {
        username: data.username || "",
        password
    };

    if (platformInfo) {
        await platformInfo.update(payload);
    } else {
        await ctx.tblPlatform.create({
            gruppi: groupId,
            platform,
            ...payload
        });
    }
}

module.exports = router;
