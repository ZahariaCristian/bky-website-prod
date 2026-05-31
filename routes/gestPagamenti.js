const router = require("express").Router();
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const Op = ctx.model.Sequelize.Op;
const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');

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