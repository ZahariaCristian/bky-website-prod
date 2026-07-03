const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const Op = ctx.model.Sequelize.Op;
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const {
    INCONTRIAMOCI_PLATFORM,
    getDefaultIncontriamociPrices
} = require("../config/incontriamociPrices");
const {
    BAKECA_PLATFORM,
    getDefaultBakecaPrices
} = require("../config/bakecaPrices");
const { getPlatformPriceKey } = require("../config/platformPrices");

const defaultIncontriamociPrices = getDefaultIncontriamociPrices();
const defaultBakecaPrices = getDefaultBakecaPrices();
const validIncontriamociPriceKeys = new Set(
    defaultIncontriamociPrices.map(getPlatformPriceKey)
);
const validBakecaPriceKeys = new Set(
    defaultBakecaPrices.map(getPlatformPriceKey)
);
let platformPriceTablePromise;

const ensurePlatformPriceTable = () => {
    if (!platformPriceTablePromise) {
        platformPriceTablePromise = ctx.tblPlatformPrices.sync().catch((error) => {
            platformPriceTablePromise = null;
            throw error;
        });
    }
    return platformPriceTablePromise;
};

const getRequestGroupId = async (req) => {
    const user = await ctx.tblUser.findOne({ where: { OID: req.session.userid } });
    if (!user) return null;
    const membership = await user.getGroup();
    return membership?.group || null;
};

const normalizeIncontriamociPrice = (row = {}) => {
    const product = `${row.product || ""}`.toLowerCase();
    const days = Number(row.days);
    let options = row.optionsJson || {};
    if (typeof options === "string") {
        try {
            options = JSON.parse(options);
        } catch {
            options = {};
        }
    }
    const timeSlot = product === "vetrina" ? "" : `${options.timeSlot || ""}`;
    const risalite = product === "vetrina" ? 0 : Number(options.risalite);
    const variantKey = product === "vetrina" ? "default" : `${timeSlot}-r${risalite}`;
    const price = Number(row.price);
    const standardPrice = Number(row.standardPrice);
    const normalized = {
        platform: INCONTRIAMOCI_PLATFORM,
        product,
        days,
        variantKey,
        optionsJson: product === "vetrina" ? {} : { timeSlot, risalite },
        price,
        standardPrice,
        active: true
    };

    if (!validIncontriamociPriceKeys.has(getPlatformPriceKey(normalized))) {
        throw new Error("Invalid Incontriamoci price combination.");
    }
    if (
        !Number.isFinite(price) ||
        !Number.isFinite(standardPrice) ||
        price < 0 ||
        standardPrice < price
    ) {
        throw new Error("Prices must be valid and standard price cannot be lower than price.");
    }

    return normalized;
};

const normalizeBakecaPrice = (row = {}) => {
    const normalized = {
        platform: BAKECA_PLATFORM,
        product: `${row.product || ""}`.toLowerCase(),
        days: Number(row.days),
        variantKey: "default",
        optionsJson: {},
        price: Number(row.price),
        standardPrice: null,
        active: true
    };

    if (!validBakecaPriceKeys.has(getPlatformPriceKey(normalized))) {
        throw new Error("Invalid Bakeca price combination.");
    }
    if (!Number.isFinite(normalized.price) || normalized.price < 0) {
        throw new Error("Bakeca price must be a valid non-negative value.");
    }

    return normalized;
};

const seedPlatformPrices = async (group, platform, defaults) => {
    const where = { group, platform };
    const existingRows = await ctx.tblPlatformPrices.findAll({
        where,
        attributes: ["platform", "product", "days", "variantKey"]
    });
    const existingKeys = new Set(
        existingRows.map((row) => getPlatformPriceKey(row.get({ plain: true })))
    );
    const missingRows = defaults.filter(
        (row) => !existingKeys.has(getPlatformPriceKey(row))
    );
    if (missingRows.length === 0) return;

    await ctx.tblPlatformPrices.bulkCreate(
        missingRows.map((row) => ({ ...row, group })),
        { ignoreDuplicates: true }
    );
};

const findPlatformPrices = (group, platform) => {
    return ctx.tblPlatformPrices.findAll({
        where: {
            group,
            platform,
            active: true
        },
        order: [
            ["product", "ASC"],
            ["days", "ASC"],
            ["variantKey", "ASC"]
        ]
    });
};

router.get("/exportCreditsReport", authenticateKey, async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).send("Sia la data di inizio che quella di fine sono obbligatorie.");
    }

    try {
        const userid = req.session.userid;
        const user = await ctx.tblUser.findOne({ where: { OID: userid } });
        const groupM = await user.getGroup();

        const payments = await ctx.tblStoricoPagamenti.findAll({
            where: {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                '$tblDonne.groupOwner$': groupM.group
            },
            include: [{ model: ctx.tblDonne, required: true }],
        });

        const credits = await ctx.tblAnnunci.findAll({
            where: {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                groupOwner: groupM.group,
                cost: { [Op.gt]: 0 }
            },
            include: [{ model: ctx.tblDonne, required: true }],
        });

        // Use composite key (name + phone)
        const donnaMap = new Map();

        // Merge payments
        payments.forEach(payment => {
            const donna = payment.tblDonne;
            if (!donna) return;
            const key = `${donna.name}-${donna.phone}`;

            if (!donnaMap.has(key)) {
                donnaMap.set(key, {
                    name: donna.name,
                    phone: donna.phone,
                    creditsUsed: 0,
                    amountPaid: 0
                });
            }
            donnaMap.get(key).amountPaid += parseFloat(payment.importo || 0);
        });

        // Merge credits
        credits.forEach(credit => {
            const donna = credit.tblDonne;
            if (!donna) return;
            const key = `${donna.name}-${donna.phone}`;

            if (!donnaMap.has(key)) {
                donnaMap.set(key, {
                    name: donna.name,
                    phone: donna.phone,
                    creditsUsed: 0,
                    amountPaid: 0
                });
            }
            donnaMap.get(key).creditsUsed += parseFloat(credit.cost || 0);
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report_crediti_${startDate}_al_${endDate}.pdf`);

        const doc = new PDFDocument({ margin: 40 });
        doc.pipe(res);

        doc.fontSize(16).text(`Report Crediti BKY`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Periodo: ${startDate} - ${endDate}`);
        doc.moveDown();
        const generationDate = new Date().toLocaleDateString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        doc.fontSize(12).text(`Data di generazione report: ${generationDate}`, {
            align: 'left'
        });
        doc.moveDown();

        const xName = 50;
        const xPhone = 200;
        const xCredits = 350;
        const xPaid = 450;
        let y = doc.y + 20;

        // Headers
        doc.font('Helvetica-Bold');
        doc.text("Donna", xName, y);
        doc.text("Telefono", xPhone, y);
        doc.text("Euro Spesi", xCredits, y);
        doc.text("Euro Ricevuti", xPaid, y);
        y += 20;

        doc.font('Helvetica');

        if (donnaMap.size === 0) {
            doc.text("Nessun dato disponibile per il periodo selezionato.", xName, y);
        } else {
            donnaMap.forEach(donna => {
                const name = donna.name.length > 15 ? donna.name.substring(0, 15) + '…' : donna.name;
                doc.text(name, xName, y);
                doc.text(donna.phone || '-', xPhone, y);
                doc.text(donna.creditsUsed.toFixed(2), xCredits, y);
                doc.text(donna.amountPaid.toFixed(2), xPaid, y);
                y += 20;

                if (y > doc.page.height - 50) {
                    doc.addPage();
                    y = 50;
                }
            });
        }

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send("Errore del server.");
    }
});

// Add this new route to get credits used between dates
router.get("/getCreditsUsedBetweenDates", authenticateKey, async (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: "Both start and end dates are required" });
    }

    try {
        const userid = req.session.userid;
        const user = await ctx.tblUser.findOne({ where: { OID: userid } });
        const groupM = await user.getGroup();

        // Get payments from storico pagamenti
        const payments = await ctx.tblStoricoPagamenti.sum('importo', {
            where: {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                '$tblDonne.groupOwner$': groupM.group
            },
            include: [{
                model: ctx.tblDonne,
                required: true
            }]
        });

        // Get credits from annunci
        const credits = await ctx.tblAnnunci.sum('cost', {
            where: {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                },
                groupOwner: groupM.group
            }
        });

        res.json({ 
            totalPayments: payments || 0,
            totalCredits: credits || 0,
            netUsage: (payments || 0) - (credits || 0)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/getListino", authenticateKey, async (req, res) => {
    
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    var listino = await ctx.tblListinoPrezzi.findAll({where:{group: groupM.group}});

    res.json({listino: listino});
});

router.get("/getIncontriamociPrices", authenticateKey, async (req, res) => {
    try {
        await ensurePlatformPriceTable();
        const group = await getRequestGroupId(req);
        if (!group) return res.status(404).json({ error: "Group not found." });
        await seedPlatformPrices(group, INCONTRIAMOCI_PLATFORM, defaultIncontriamociPrices);
        const prices = await findPlatformPrices(group, INCONTRIAMOCI_PLATFORM);
        res.json({ prices });
    } catch (error) {
        console.error("Unable to load Incontriamoci prices:", error);
        res.status(500).json({ error: "Unable to load Incontriamoci prices." });
    }
});

router.post("/updateIncontriamociPrices", authenticateKey, async (req, res) => {
    if (
        !Array.isArray(req.body.rows) ||
        req.body.rows.length === 0 ||
        req.body.rows.length > defaultIncontriamociPrices.length
    ) {
        return res.status(400).json({ error: "A valid price list is required." });
    }

    try {
        await ensurePlatformPriceTable();
        const group = await getRequestGroupId(req);
        if (!group) return res.status(404).json({ error: "Group not found." });
        const normalizedRows = req.body.rows.map(normalizeIncontriamociPrice);
        const rows = Array.from(new Map(
            normalizedRows.map((row) => [getPlatformPriceKey(row), row])
        ).values());

        await ctx.model.transaction(async (transaction) => {
            for (const row of rows) {
                const where = {
                    group,
                    platform: row.platform,
                    product: row.product,
                    days: row.days,
                    variantKey: row.variantKey
                };
                const [price] = await ctx.tblPlatformPrices.findOrCreate({
                    where,
                    defaults: { ...where, ...row },
                    transaction
                });
                await price.update({
                    optionsJson: row.optionsJson,
                    price: row.price,
                    standardPrice: row.standardPrice,
                    active: true
                }, { transaction });
            }
        });

        const prices = await findPlatformPrices(group, INCONTRIAMOCI_PLATFORM);
        res.json({ prices });
    } catch (error) {
        const validationMessage = error?.message?.startsWith("Invalid") ||
            error?.message?.startsWith("Prices");
        if (validationMessage) {
            return res.status(400).json({ error: error.message });
        }
        console.error("Unable to save Incontriamoci prices:", error);
        res.status(500).json({ error: "Unable to save Incontriamoci prices." });
    }
});

router.get("/getBakecaPrices", authenticateKey, async (req, res) => {
    try {
        await ensurePlatformPriceTable();
        const group = await getRequestGroupId(req);
        if (!group) return res.status(404).json({ error: "Group not found." });
        await seedPlatformPrices(group, BAKECA_PLATFORM, defaultBakecaPrices);
        const prices = await findPlatformPrices(group, BAKECA_PLATFORM);
        res.json({ prices });
    } catch (error) {
        console.error("Unable to load Bakeca prices:", error);
        res.status(500).json({ error: "Unable to load Bakeca prices." });
    }
});

router.post("/updateBakecaPrices", authenticateKey, async (req, res) => {
    if (
        !Array.isArray(req.body.rows) ||
        req.body.rows.length === 0 ||
        req.body.rows.length > defaultBakecaPrices.length
    ) {
        return res.status(400).json({ error: "A valid Bakeca price list is required." });
    }

    try {
        await ensurePlatformPriceTable();
        const group = await getRequestGroupId(req);
        if (!group) return res.status(404).json({ error: "Group not found." });
        const normalizedRows = req.body.rows.map(normalizeBakecaPrice);
        const rows = Array.from(new Map(
            normalizedRows.map((row) => [getPlatformPriceKey(row), row])
        ).values());

        await ctx.model.transaction(async (transaction) => {
            for (const row of rows) {
                const where = {
                    group,
                    platform: row.platform,
                    product: row.product,
                    days: row.days,
                    variantKey: row.variantKey
                };
                const [price] = await ctx.tblPlatformPrices.findOrCreate({
                    where,
                    defaults: { ...where, ...row },
                    transaction
                });
                await price.update({
                    optionsJson: {},
                    price: row.price,
                    standardPrice: null,
                    active: true
                }, { transaction });
            }
        });

        const prices = await findPlatformPrices(group, BAKECA_PLATFORM);
        res.json({ prices });
    } catch (error) {
        const validationMessage = error?.message?.startsWith("Invalid") ||
            error?.message?.startsWith("Bakeca price");
        if (validationMessage) {
            return res.status(400).json({ error: error.message });
        }
        console.error("Unable to save Bakeca prices:", error);
        res.status(500).json({ error: "Unable to save Bakeca prices." });
    }
});

router.get("/getCrediti", authenticateKey, async (req, res) => {
    
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    var annunci = await ctx.tblAnnunci.findAll({where:{groupOwner: groupM.group, cost: {[Op.gt]: 0}, GCRecord: null}, include:[{model: ctx.tblDonne, required: true}]});

    res.json({crediti: annunci});
});

router.get("/getListinoSuper", authenticateKey, async (req, res) => {
    
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    var listino = await ctx.tblListinoPrezziSuper.findAll({where:{group: groupM.group}});

    res.json({listino: listino});
});

router.post("/updateListino", authenticateKey, async (req, res) => {
    if (!req.body.rows) return res.sendStatus(400);
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    for(row of req.body.rows){
        var listino = await ctx.tblListinoPrezzi.findOne({where: {id: row.id}});
        if(!listino){
            var rowDB = await ctx.tblListinoPrezzi.create({
                group: groupM.group,
                uscita: row.uscita,
                oneXone: row.oneXone,
                oneXthree: row.oneXthree,
                oneXseven: row.oneXseven,
                tenXone: row.tenXone,
                tenXthree: row.tenXthree,
                tenXseven: row.tenXseven,
                supertop: row.supertop,
                highlight: row.highlight,
                etichetta: row.etichetta,
                supertopnotte: row.supertopnotte,
                highlightnotte: row.highlightnotte,
                etichettanotte: row.etichettanotte
            });
            row.id = rowDB.id;
        }else{
            await ctx.tblListinoPrezzi.update({
                group: groupM.group,
                uscita: row.uscita,
                oneXone: row.oneXone,
                oneXthree: row.oneXthree,
                oneXseven: row.oneXseven,
                tenXone: row.tenXone,
                tenXthree: row.tenXthree,
                tenXseven: row.tenXseven,
                supertop: row.supertop,
                highlight: row.highlight,
                etichetta: row.etichetta,
                supertopnotte: row.supertopnotte,
                highlightnotte: row.highlightnotte,
                etichettanotte: row.etichettanotte
            },{where: {id: row.id}});
        }
    }
    res.json(req.body.rows);
    //res.sendStatus(200);
});

router.post("/updateCredits", authenticateKey, async (req, res) => {
    if (!req.body.rows) return res.sendStatus(400);
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    for(row of req.body.rows){
        if (row.payed >= row.cost){
            var annuncio = await ctx.tblAnnunci.findOne({where:{id: row.id}});
            await annuncio.update({payed: 0, cost: 0});
            await ctx.tblStoricoPagamenti.create({donna: annuncio.donna, importo: row.payed});
            var ads = await annuncio.getTblSchedulazionis({where:{payed: null}});
            for(ad of ads){
                await ad.update({payed: true});
            }
        }else{
            await ctx.tblAnnunci.update({payed: row.payed}, {where:{id: row.id}});
        }
        
    }
    res.sendStatus(200);
});

router.post("/updateListinoSuper", authenticateKey, async (req, res) => {
    if (!req.body.rows) return res.sendStatus(400);
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({where:{OID: userid}});
    var groupM = await user.getGroup();
    
    for(row of req.body.rows){
        var listinoSuper = await ctx.tblListinoPrezziSuper.findOne({where:{id: row.id}});
        if (listinoSuper){
            await listinoSuper.update({oneXone: row.oneXone, oneXthree: row.oneXthree, oneXseven: row.oneXseven, tenXone: row.tenXone, tenXthree: row.tenXthree, tenXseven: row.tenXseven});
        }else{
            await ctx.tblListinoPrezziSuper.create({group: groupM.id, typeSuper: "SUPERTOP", oneXone: row.oneXone, oneXthree: row.oneXthree, oneXseven: row.oneXseven, tenXone: row.tenXone, tenXthree: row.tenXthree, tenXseven: row.tenXseven});
        }
    };
  
    res.sendStatus(200);
});

module.exports = router;
