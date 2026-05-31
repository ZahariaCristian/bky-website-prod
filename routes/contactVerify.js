const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");

router.post("/", authenticateKey, async (req, res) => {
    const { operation } = req.body;
    const prevNumCheck = await ctx.tblContactVerifyBakeca.findOne({where: {phone: operation.phone}})
    if(prevNumCheck && prevNumCheck.remoteID){
        if(prevNumCheck.action === 'checked'){
            return res.sendStatus(204)
        }
    }
    const storedOperation = await ctx.tblContactVerifyBakeca.findOne({where:{remoteID: operation.id}});

    if (!storedOperation) {
        await ctx.tblContactVerifyBakeca.create({
            remoteID: operation.id,
            action: operation.action,
            status: operation.status,
            approved: operation.approved,
            code: operation.code,
            phone: operation.phone,
            city: operation.city
        });
        return res.sendStatus(201);
        // check operation pending
    };

    if (storedOperation.code != null){
        if (storedOperation.code == "cancel"){
            await storedOperation.update({
                action: "uncheck"
            });
            return res.sendStatus(200);
        }
    }
    
    if (storedOperation.approved) {
        await storedOperation.update({
            remoteID: operation.id,
            action: operation.action,
            status: operation.status,
            approved: operation.approved,
            code: operation.code,
            phone: operation.phone,
            city: operation.city
        });
        return res.sendStatus(204);
        // contact successfully verified
    };

    if (!storedOperation.status){
        return res.sendStatus(202);
        // nothing new. retry later
    }
    
    if (storedOperation.action === "check") {
        if (!operation.code) return res.sendStatus(402);
        await storedOperation.update({
            code: operation.code,
            status: false,
            action: "code"
        });
        return res.sendStatus(201);
        // send code operation pending
    };

    await storedOperation.update({
        code: "undefined",
        status: true,
        action: "check"
    });

    res.sendStatus(403);
    // invalid code sent

});

module.exports = router;