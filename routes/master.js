const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");

router.get("/getCreditBK", authenticateKey, async (req, res) => {
    const userid = req.session.userid;

    try {
        const user = await ctx.tblUser.findOne({
            where: { OID: userid },
            include: [{ model: ctx.tblMembriGruppo, as: 'group', required: true }]
        });

        if (!user) return res.sendStatus(203);

        const group = await ctx.tblGruppi.findOne({ where: { id: user.group.group } });
        if (!group) return res.sendStatus(203);

        const couponAvailable = group.coupon === true;
        const platformInfo = ctx.tblPlatform
            ? await ctx.tblPlatform.findAll({
                where: {
                    gruppi: group.id,
                    platform: ["bakeca", "megaescort", "trovagnocca"]
                }
            })
            : [];
        const platformCredits = platformInfo.reduce((credits, platform) => {
            credits[platform.platform] = platform.credit;
            return credits;
        }, {});

        console.log(`User ${userid} has BK credit: ${group.bkCredit}, Coupon available: ${couponAvailable}`);

        return res.json({
            bk: group.bkCredit,
            coupon: couponAvailable,
            bakeca: platformCredits.bakeca,
            megaescort: platformCredits.megaescort,
            trovagnocca: platformCredits.trovagnocca
        });

    } catch (error) {
        console.error("Error in /getCreditBK:", error);
        return res.sendStatus(500);
    }
});

router.get("/getNavigator", authenticateKey, async (req, res) => {
    var userid = req.session.userid;
    const user = await ctx.tblUser.findOne({where:{OID: userid}});
    if (user){
        var rolePermission = await user.getTblUserRoles();
        if(rolePermission.length > 0){
            var role = await rolePermission[0].getTblRole();
            if(role){
                var navigator = await role.getTblNavigationPermissions();
                return res.json({navigator: navigator});
            }
        }
    }
    res.sendStatus(203);
});

module.exports = router;
