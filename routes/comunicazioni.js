const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");

router.get("/get", authenticateKey, async (req, res) => {
    const userID = req.session.userid;
    
    try {
        // Get all comunicazioni (not just unread)
        const allComunicazioni = await ctx.tblComunicazioni.findAll({
            where: { GCRecord: null },
            include: [
                {
                    model: ctx.tblUser,
                    required: true,
                    attributes: ['userName']
                },
                {
                    model: ctx.tblComunicazioniReadStatus,
                    as: 'readStatuses',
                    where: { userId: userID },
                    required: false,
                    attributes: ['readAt'] // Only fetch what we need
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        // Add isRead flag to each communication
        const comunicazioniWithStatus = allComunicazioni.map(c => ({
            ...c.get({ plain: true }),
            isRead: c.readStatuses && c.readStatuses.length > 0
        }));

        const user = await ctx.tblUser.findByPk(userID);
        const rolePermission = await user.getTblUserRoles();
        
        if (rolePermission.length > 0) {
            const role = await rolePermission[0].getTblRole();
            if (role) {
                return res.json({ 
                    rows: comunicazioniWithStatus, 
                    admin: role.IsAdministrative 
                });
            }
        }
        res.sendStatus(400);
    } catch (error) {
        console.error('Error fetching comunicazioni:', error);
        res.sendStatus(500);
    }
});

router.post("/mark-as-read", authenticateKey, async (req, res) => {
    const userID = req.session.userid;
    
    try {
        // Get all unread comunicazioni for this user
        const unreadComunicazioni = await ctx.tblComunicazioni.findAll({
            where: { GCRecord: null },
            include: [{
                model: ctx.tblComunicazioniReadStatus,
                as: 'readStatuses',
                where: { userId: userID },
                required: false
            }]
        });

        // Filter to only those not already read
        const toMarkAsRead = unreadComunicazioni.filter(c => 
            !c.readStatuses || 
            c.readStatuses.length === 0
        );

        // Use findOrCreate to avoid duplicates
        await Promise.all(
            toMarkAsRead.map(c => 
                ctx.tblComunicazioniReadStatus.findOrCreate({
                    where: {
                        userId: userID,
                        comunicazioneId: c.id
                    },
                    defaults: {
                        readAt: new Date()
                    }
                })
            )
        );

        res.sendStatus(200);
    } catch (error) {
        console.error('Error marking comunicazioni as read:', error);
        res.sendStatus(500);
    }
});

router.post("/delete", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var userID = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userID}});
    if(!user) return res.sendStatus(400);
    var rolePermission = await user.getTblUserRoles();
    if(rolePermission.length > 0){
        var role = await rolePermission[0].getTblRole();
        if(role){
            if (role.IsAdministrative){
                await ctx.tblComunicazioni.update({GCRecord: ctx.newGCRecord()}, {where:{id: req.body.id}});
                return res.sendStatus(200);
            }
        }
    }
    res.sendStatus(400);
});

router.post("/post", authenticateKey, async (req, res) => {
    if (!req.body.message) return res.sendStatus(400);
    var userID = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userID}});
    if(!user) return res.sendStatus(400);
    var rolePermission = await user.getTblUserRoles();
    if(rolePermission.length > 0){
        var role = await rolePermission[0].getTblRole();
        if(role){
            if (role.IsAdministrative){
                var post = await ctx.tblComunicazioni.create({description: req.body.message, user: userID});
                post = post.dataValues;
                post.admin = true;
                post.tblUser = {};
                post.tblUser.userName = user.userName;
                return res.json(post);
            }
        }
    }
    res.sendStatus(400);
});

module.exports = router;