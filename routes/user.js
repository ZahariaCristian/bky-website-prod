const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const salt = require("../lib/salt");

router.post("/get", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var utente = await ctx.tblUser.findOne({where:{GCRecord: null, OID: req.body.id}});
    if(!utente) return res.sendStatus(400);
    var roleID = "";
    var rolePermission = await utente.getTblUserRoles();
    if(rolePermission.length > 0){
        var role = await rolePermission[0].getTblRole();
        if(role){
            roleID = role.id;
        }
    }
    utente = utente.dataValues;
    utente.role = roleID;
    res.json({user: utente});
});

router.post("/edit", authenticateKey, async (req, res) => {
    if (!req.body.user) return res.sendStatus(400);
    var userID = req.session.userid;
    var myUser = await ctx.tblUser.findOne({where:{OID: userID}});
    if(!myUser) return res.sendStatus(400);
    var rolePermission = await myUser.getTblUserRoles();
    if(rolePermission.length > 0){
        var role = await rolePermission[0].getTblRole();
        if(role){
            if (role.IsAdministrative){
                var utente = await ctx.tblUser.findOne({where:{GCRecord: null, OID: req.body.user.OID}});
                if(!utente) return res.sendStatus(400);
                var user = req.body.user;
                var role = await ctx.tblRole.findOne({where:{id: user.role}});
                if (!role) return res.sendStatus(400);
                if(user.password.length == 0){
                    user.storedPassword = utente.password;
                }else{
                    user.storedPassword = await salt.SaltPasswordSync(user.password);
                }
                await utente.update({
                    userName: user.userName,
                    mail: user.mail,
                    isActive: user.isActive,
                    forceChangePassword: user.forceChangePassword,
                    password: user.storedPassword
                });
                var rolePermission = await utente.getTblUserRoles();
                if(rolePermission.length > 0){
                    await rolePermission[0].update({
                        role: role.id
                    });
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
                res.json({roles: roles});
            }
        }
    }else{
        return res.sendStatus(400);
    }
});

module.exports = router;