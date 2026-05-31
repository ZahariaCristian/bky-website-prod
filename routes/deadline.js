const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const Op = ctx.model.Sequelize.Op;

// Set expiresAt for an annuncio
router.post("/setExpiresAt", authenticateKey, async (req, res) => {
    try {
        const { annuncioId, expiresAt } = req.body;
        if (!annuncioId || !expiresAt) {
            return res.status(400).json({ success: false, error: "annuncioId and expiresAt required" });
        }

        const annuncio = await ctx.tblAnnunci.findOne({ where: { id: annuncioId } });
        if (!annuncio) return res.status(404).json({ success: false, error: "Annuncio not found" });

        annuncio.expiresAt = expiresAt.toString();
        await annuncio.save();

        res.json({ success: true });
    } catch (err) {
        console.error("Error in /setExpiresAt:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Toggle notifyEnabled for an annuncio
router.post("/togglenotifyenabled", authenticateKey, async (req, res) => {
    try {
        const { annuncioId } = req.body;
        if (!annuncioId) {
            return res.status(400).json({ success: false, error: "annuncioId required" });
        }

        const annuncio = await ctx.tblAnnunci.findOne({ where: { id: annuncioId } });
        if (!annuncio) return res.status(404).json({ success: false, error: "Annuncio not found" });

        annuncio.notifyEnabled = !annuncio.notifyEnabled;
        await annuncio.save();

        res.json({ success: true, notifyEnabled: annuncio.notifyEnabled });
    } catch (err) {
        console.error("Error in /toggleNotifyEnabled:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post("/getOne", authenticateKey, async (req, res) => {
    try {
        console.log("POST /getOne called. Body:", req.body);

        const { annuncioId } = req.body;
        if (!annuncioId) {
            console.log("Missing annuncioId in request body.");
            return res.status(400).json({ success: false, error: "annuncioId required" });
        }

        const annuncio = await ctx.tblAnnunci.findOne({ where: { id: annuncioId } });
        if (!annuncio) {
            console.log(`Annuncio not found for id: ${annuncioId}`);
            return res.status(404).json({ success: false, error: "Annuncio not found" });
        }

        console.log(`Annuncio found:`, annuncio.id);
        res.json({ success: true, annuncio });
    } catch (err) {
        console.error("Error in /getOne:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/whatsapp-qr', authenticateKey, async (req, res) => {
    try {
        const user = await ctx.tblUser.findOne({ where: { OID: req.session.userid } });
        if (!user) {
            console.log("User not found for session ID:", req.session.userid);
            return res.sendStatus(404);
        }
        console.log("Found user:", user.userName);

        // Get QR code and status for this user
        const qr = user.whatsapp_qr;
        const status = user.whatsapp_active ? 1 : 0;

        if (!qr) return res.status(404).json({ error: 'QR code not found' });

        res.json({ qr, status });
    } catch (err) {
        console.error("Error in /api/whatsapp-qr:", err);
        res.status(500).json({ error: err.message });
    }
});


router.post("/getAll", authenticateKey, async (req, res) => {
    if (!req.body.day) return res.sendStatus(400);
    
    var schedulazioni = await getSchedulazioni(req.session.userid, req.body.day);

    var dateFilter = new Date(req.body.day);
    dateFilter.setHours(0);
    dateFilter.setDate(dateFilter.getDate() + 1);
    var schedulazioniFiltrate = schedulazioni.filter( x => {if(x.deadline > new Date(req.body.day) && x.deadline < dateFilter) return x;});
    
    const result = schedulazioniFiltrate.map(s => {
        return {
            ...s.toJSON(), // this will include notified if not filtered out
            notified: s.notified // ensure notified is at the top level
        };
    });

    res.json(result);
});

router.post("/get", authenticateKey, async (req, res) => {
    if (!req.body.day) return res.sendStatus(400);
    
    var schedulazioni = await getSchedulazioni(req.session.userid, req.body.day);

    // const schedulazioni = await ctx.model.query(`WITH tblschedulazioni AS (
    //     SELECT m.*, ROW_NUMBER() OVER (PARTITION BY annuncio ORDER BY data DESC) AS rn
    //     FROM tblschedulazioni AS m 
    //     where GCRecord is null and (data > '${dateSel.toISOString().replace("T", " ").replace(".000Z", "")}' and data < '${dateAfter.toISOString().replace("T", " ").replace(".000Z", "")}')
    //   )
    //   SELECT 
    //     s.id,
    //     s.data,
    //     s.annuncio,  
    //     s.typeAnnuncio, 
    //     s.rn, 
    //     a.id AS 'AnnuncioID',
    //     a.GCRecord,
    //     a.groupOwner,
    //     a.title, 
    //     a.donna, 
    //     d.id AS 'DonnaID',
    //     d.name 
    //   FROM tblschedulazioni 
    //   AS s RIGHT JOIN tblannunci AS a ON a.id = s.annuncio 
    //   RIGHT JOIN tbldonne AS d ON d.id = a.donna 
    //   WHERE s.rn = 1 and a.GCRecord is null and a.groupOwner = ${membroGruppo.group};`);

    var outS = new Array;

    for (s of schedulazioni){
        var dead = new Date(s.data);
        var period = new Date(s.data);
        
        if (s.typeAnnuncio != "Free" && s.typeAnnuncio != "10x1" && s.typeAnnuncio != "10x3" && s.typeAnnuncio != "10x7"){
            var hPeriod = parseInt(s.period.substr(0,2));
            period.setHours(hPeriod);
            period.setMinutes(period.getMinutes() + (period.getTimezoneOffset() * -1));
        }
        
        switch(s.typeAnnuncio){
            case "Free":
                dead.setDate(dead.getDate() + 1);
            break;
            case "1x1":
                if (s.data < period){
                    dead.setDate(dead.getDate() + 1);
                }else{
                    dead.setDate(dead.getDate() + 2);
                }
            break;
            case "1x3":
                if (s.data < period){
                    dead.setDate(dead.getDate() + 3);
                }else{
                    dead.setDate(dead.getDate() + 4);
                }
            break;
            case "1x7":
                if (s.data < period){
                    dead.setDate(dead.getDate() + 7);
                }else{
                    dead.setDate(dead.getDate() + 8);
                }
            break;
            case "10x1":
                    dead.setDate(dead.getDate() + 1);
            break;
            case "10x3":
                    dead.setDate(dead.getDate() + 4);
            break;
            case "10x7":
                    dead.setDate(dead.getDate() + 8);
            break;
        }
        s.dead = dead;
        var item = null;
        item = outS.filter( x => {if(x.tblAnnunci.id == s.tblAnnunci.id) return x;});
        if (item.length != 0){
            if(s.dead > item[0].dead){
                var i = find(s.annuncio, outS);
                if (i > -1) {
                    outS.splice(i, 1);
                    outS.push(s);
                }                
            }
        }else{
            outS.push(s);
        }
    }

    for (let s of outS) {
    const allForAnnuncio = schedulazioni.filter(x => x.tblAnnunci.id == s.tblAnnunci.id);
    s.notified = allForAnnuncio.some(x => x.notified);
    }

    var startFilter = new Date(req.body.day);
    startFilter.setHours(0);
    var dateFilter = new Date(req.body.day);
    dateFilter.setHours(0);
    dateFilter.setDate(dateFilter.getDate() + 1);
    var schedulazioniFiltrate = outS.filter( x => {if(x.dead > startFilter && x.dead < dateFilter) return x;});
    res.json(schedulazioniFiltrate);
});

async function getSchedulazioni(user, day){
    var dateSel = new Date(day);
    dateSel.setHours(2);
    dateSel.setDate(dateSel.getDate() - 10);
    var dateAfter = new Date(day);
    dateAfter.setDate(dateAfter.getDate() + 7);
    var userID = user;
    var utente = await ctx.tblUser.findOne({where: {OID: userID}});
    var membroGruppo = await utente.getGroup();

    return await ctx.tblSchedulazioni.findAll({
        where:{
            [Op.and]:[
                {data: {[Op.gt]: dateSel}},
                {data: {[Op.lt]: dateAfter}}
            ],
            GCRecord: null
        },
        include: [{
            model: ctx.tblAnnunci,
            required: true,
            where: {GCRecord: null, groupOwner: membroGruppo.group},
            include: [{
                model: ctx.tblDonne,
                required: true
            }]
        }]
    });
}

function find(annuncioID, schedulazioni) {
    var index = -1;
    for(x of schedulazioni){
        index++;
        if(x.annuncio == annuncioID) return index;
    }
    return -1;
}

router.post("/getWhatsappLogs", authenticateKey, async (req, res) => {
    try {
        console.log("getWhatsappLogs called. Session user ID:", req.session.userid);

        // Get the logged-in user from session
        const user = await ctx.tblUser.findOne({ where: { OID: req.session.userid } });
        if (!user) {
            console.log("User not found for session ID:", req.session.userid);
            return res.sendStatus(404);
        }
        console.log("Found user:", user.userName);

        // Get logs only for this username, most recent first, using Sequelize model
        const logs = await ctx.whatsapp_logs.findAll({
            where: { username: user.userName },
            order: [['sent_at', 'DESC']]
        });

        console.log("Fetched logs count:", logs.length);

        res.json({ success: true, logs });
    } catch (err) {
        console.error("Error in /getWhatsappLogs:", err);
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

router.post("/getWhatsappMessage", authenticateKey, async (req, res) => {
    try {
        const user = await ctx.tblUser.findOne({ where: { OID: req.session.userid } });
        if (!user) return res.sendStatus(404);

        // Use the new whatsapp table structure
        let msgRow = await ctx.whatsapp.findOne({
            where: { username: user.userName }
        });

        // If not found, create a new row with default values
        if (!msgRow) {
            msgRow = await ctx.whatsapp.create({
                username: user.userName,
                message: "",
                inviati: 0,
                active: true
            });
        }

        // Return all relevant fields for the frontend if needed
        res.json({ 
            message: msgRow.message,
            inviati: msgRow.inviati,
            active: msgRow.active
        });
    } catch (err) {
        console.error("Error in /getWhatsappMessage:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post("/setWhatsappMessage", authenticateKey, async (req, res) => {
    try {
        const { message, active } = req.body;
        if (typeof message !== "string") return res.sendStatus(400);

        const user = await ctx.tblUser.findOne({ where: { OID: req.session.userid } });
        if (!user) return res.sendStatus(404);

        const [msgRow, created] = await ctx.whatsapp.findOrCreate({
            where: { username: user.userName },
            defaults: { message, active: active !== undefined ? active : true }
        });

        if (!created) {
            msgRow.message = message;
            if (active !== undefined) msgRow.active = active;
            await msgRow.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Error in /setWhatsappMessage:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
