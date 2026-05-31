const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const Mailer = require("../lib/mailer");
const salt = require("../lib/salt");

router.post("/new", authenticateKey, async (req, res) => {
    if (!req.body.user) return res.sendStatus(400);
    var userData = req.body.user;
    var userID = req.session.userid;
    var myUser = await ctx.tblUser.findOne({where:{OID: userID}});
    if(!myUser) return res.sendStatus(400);
    var rolePermission = await myUser.getTblUserRoles();
    if(rolePermission.length > 0){
        var role = await rolePermission[0].getTblRole();
        if(role){
            if (role.IsAdministrative){
                var checkUserName = await ctx.tblUser.findOne({where: {userName: userData.userName}});
    if (checkUserName) return res.sendStatus(402);

    var role = await ctx.tblRole.findOne({where:{id: userData.role}});
    if (!role) return res.sendStatus(400);

    userData.storedPassword = await salt.SaltPasswordSync(userData.password);

    var newUser = await ctx.tblUser.create({
        userName: userData.userName,
        password: userData.storedPassword,
        mail: userData.mail,
        isActive: userData.isActive,
        forceChangePassword: userData.forceChangePassword,
        firstTime: true
    });
    var group = await ctx.tblGruppi.create({
        name: `${newUser.userName}'s Team`,
        owner: newUser.OID,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    await ctx.tblMembriGruppo.create({
        group: group.id,
        member: newUser.OID,
        owner: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    
    ctx.tblUserRole.create({user: newUser.OID, role: role.id});

    var newMail = new Mailer(newUser.mail, "BKY: Sei stato registrato al portale");
          var resMail = await newMail.Send(`
            <body>
                <h1>BKY</h1>
                <p>&nbsp;</p>
                <p>Di seguito trovi i tuoi dati per accedere al portale.</p>
                <p>&nbsp;</p>
                <p><b>Nome Utente:</b> ${newUser.userName}</p>
                <p><b>Password:</b> ${userData.password}</p>
                <p>&nbsp;</p>
                <p>Al tuo primo accesso molto probabilmente ti verrà chiesto di reimpostare la tua password, in alternative provvedi tu stesso navigando il menu, <b>Account</b></p>
                <p>&nbsp;</p>
                <a href="${req.protocol}://${req.hostname}">Accedi</a>
            </body>
            `);

    if(resMail){
        return res.sendStatus(401);
    }

    return res.sendStatus(200);
            }
        }
    }
    res.sendStatus(400);

});
router.get("/getRole", authenticateKey, async (req, res) => {
    var userid = req.session.userid;
    var utente = await ctx.tblUser.findOne({where:{GCRecord: null, OID: userid}});
    if(!utente) return res.sendStatus(400);
    var rolePermission = await utente.getTblUserRoles();
    if(rolePermission.length > 0){
        var role = await rolePermission[0].getTblRole();
        if(role){
            if(role.IsAdministrative){
                var roles = await ctx.tblRole.findAll();
                return res.json({roles: roles});
            }
        }
    }
    return res.sendStatus(400);
});

module.exports = router;