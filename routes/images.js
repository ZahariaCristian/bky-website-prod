const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const fs = require("fs");
const { authenticateKey } = require("../lib/authentication");
const { isMoscarossaExpired } = require("../lib/moscarossaExpiration");
const { moscarossaImageLimit, selectMoscarossaImages } = require("../lib/moscarossaGalleryApply");
const ctx = require("../ctx/model");
const { dirname } = require('path');
const appDir = dirname(require.main.filename);
const Op = ctx.model.Sequelize.Op;
var rootPath;

if (process.env.PROD == 0){
    rootPath = `${appDir}`
}else{
    rootPath = `${process.env.APP_PATH_PRODUCTION}`
}

const GLOBAL_PATH = process.env.Global_Path.trim();
var lstFiles = [];

// The general gallery is not automatically copied to already-published ads.
// This explicit action is called only after /images/update and /annuncio/updateInfo succeed.
router.post("/applyMoscarossaGallery", authenticateKey, async (req, res) => {
    const annuncioId = Number(req.body.annuncioId);
    const imageIds = req.body.imageIds;
    const validIds = Array.isArray(imageIds) && imageIds.length > 0 && imageIds.length <= 20 &&
        imageIds.every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0);
    if (!Number.isSafeInteger(annuncioId) || annuncioId <= 0 || !validIds ||
        new Set(imageIds.map(Number)).size !== imageIds.length) {
        return res.status(400).json({ error: "Seleziona da 1 a 20 foto valide da applicare." });
    }

    try {
        const user = await ctx.tblUser.findOne({ where: { OID: req.session.userid } });
        const membership = user ? await user.getGroup() : null;
        if (!membership) return res.status(403).json({ error: "Gruppo utente non disponibile." });
        const annuncio = await ctx.tblAnnunci.findOne({
            where: { id: annuncioId, groupOwner: membership.group, GCRecord: null }
        });
        if (!annuncio) return res.status(404).json({ error: "Annuncio non trovato." });

        const donna = await annuncio.getTblDonne();
        if (!donna) return res.status(404).json({ error: "Galleria non trovata." });
        const gallery = await donna.getTblGalleria({
            where: { id: { [Op.in]: imageIds.map(Number) }, GCRecord: null,
                [Op.or]: [{ isHidden: false }, { isHidden: null }] }
        });
        if (gallery.length !== imageIds.length) {
            return res.status(409).json({ error: "Alcune foto non sono più disponibili. Ricarica la pagina." });
        }
        const previewGalleryId = `${req.body.previewGalleryId || ""}`;
        if (previewGalleryId && !imageIds.some((id) => `${id}` === previewGalleryId)) {
            return res.status(400).json({ error: "L'anteprima scelta non è nella galleria salvata." });
        }

        const result = await ctx.model.transaction(async (transaction) => {
            const schedules = await ctx.tblSchedulazioni.findAll({
                where: { annuncio: annuncioId, platform: "moscarossa", GCRecord: null,
                    remotePostID: { [Op.ne]: null } },
                order: [["data", "DESC"], ["id", "DESC"]], transaction
            });
            const seenRemoteIds = new Set();
            let queued = 0;
            let skippedExpired = 0;
            let skippedInactive = 0;
            let omittedByLimit = 0;
            for (const schedule of schedules) {
                const remoteId = `${schedule.remotePostID}`;
                if (seenRemoteIds.has(remoteId)) continue;
                seenRemoteIds.add(remoteId);
                if (!["OK", "EDIT"].includes(schedule.state)) {
                    skippedInactive += 1;
                    continue;
                }
                if (isMoscarossaExpired(schedule)) {
                    skippedExpired += 1;
                    continue;
                }
                const selected = selectMoscarossaImages(
                    imageIds, previewGalleryId, moscarossaImageLimit(schedule)
                );
                omittedByLimit += imageIds.length - selected.length;
                await ctx.tblGalleriaAnnuncio.update({ GCRecord: ctx.newGCRecord() }, {
                    where: { schedulazione: schedule.id, GCRecord: null }, transaction
                });
                for (const image of selected) {
                    await ctx.tblGalleriaAnnuncio.create({
                        ...image, schedulazione: schedule.id
                    }, { transaction });
                }
                await schedule.update({ state: "EDIT", editedBy: req.session.userid,
                    errorReason: "MOSCAROSSA_GALLERY_PENDING" }, { transaction });
                queued += 1;
            }
            return { queued, skippedExpired, skippedInactive, omittedByLimit };
        });
        return res.json(result);
    } catch (error) {
        console.error("Moscarossa gallery apply failed:", error);
        return res.status(500).json({ error: "Impossibile applicare le foto alle pubblicazioni Moscarossa." });
    }
});

router.post("/update", upload.array("imgs"), async (req, res) => {
    if (!req.query.phone) return res.sendStatus(400);
    if (!req.query.ann) return res.sendStatus(400);

    const isMoscarossa = `${req.query.panel || ""}`.toLowerCase() === "moscarossa";
    if (isMoscarossa) {
        const files = Array.isArray(req.files) ? req.files : [];
        const invalidFile = files.find((file) =>
            !`${file.mimetype || ""}`.toLowerCase().startsWith("image/") || file.size > 5 * 1024 * 1024
        );
        if (files.length > 20 || invalidFile) return res.sendStatus(413);
    }

    const bodyArray = (value) => Array.isArray(value) ? value : (value === undefined ? [] : [value]);
    const origins = bodyArray(req.body.origin);
    const hiddenFlags = bodyArray(req.body.hidden);
    const isNewFlags = bodyArray(req.body.isNew);
    const replacedGalleryIds = new Set(origins.filter((id, index) =>
        id && index < (req.files?.length || 0) && isNewFlags[index] === "true")
        .map((id) => `${id}`));
    let expiredSchedulesSkipped = 0;

    // Creating the folder if it does not exist
    if (!fs.existsSync(`${rootPath}/girls/${req.query.phone}`))
        fs.mkdirSync(`${rootPath}/girls/${req.query.phone}`);
    if (isMoscarossa) {
        fs.mkdirSync(`${rootPath}/girls/${req.query.phone}/pics`, { recursive: true });
    }
    if(fs.existsSync(`${rootPath}/girls/${req.query.phone}/pics`)){
        // var exludeWrite = [];
        //  lstFiles = fs.readdirSync(`${rootPath}/girls/${req.query.phone}/pics`);
        //  for (f of lstFiles){
        //      try{
        //         fs.unlinkSync(`${rootPath}/girls/${req.query.phone}/pics/${f}`);
        //      }catch{
        //         exludeWrite.push(f);
        //      }
        //  }
        var sevenDay = new Date();
        sevenDay.setDate(sevenDay.getDate() - 7);
        var annuncio = await ctx.tblAnnunci.findOne({where:{id: req.query.ann}});
        var scheduled = await annuncio.getTblSchedulazionis({where: isMoscarossa
            ? {
                platform: "moscarossa",
                GCRecord: null,
                [Op.or]: [
                    { data: { [Op.gt]: sevenDay } },
                    { remotePostID: { [Op.ne]: null } }
                ]
            }
            : { data: { [Op.gt]: sevenDay } }});
        for(s of scheduled){
            if (!isMoscarossa) {
                await ctx.tblGalleriaAnnuncio.update({GCRecord: ctx.newGCRecord()}, {where:{schedulazione: s.id}});
            }
        }
        // Writing the image files
        for (let i = 0; i < req.files.length; i++){
            const galleryId = origins[i];
            if (!galleryId) continue;

            if (isNewFlags[i] == "true") {
                await writeImgFile(req.files[i], i, galleryId, req.query.phone);
            } else {
                await ctx.tblGalleria.update({
                    src: `/images/get?phone=${req.query.phone}&index=${i}`,
                    GCRecord: null
                }, {
                    where: { id: galleryId }
                });
            }

            if (isMoscarossa) continue;
            for(s of scheduled){
                var anteprima = true;
                var gS = await ctx.tblGalleriaAnnuncio.findOne({where:{galleria: galleryId, schedulazione: s.id}});
                if (!gS){
                    if (hiddenFlags[i] == "true"){
                        await ctx.tblGalleriaAnnuncio.create({galleria: galleryId, schedulazione: s.id, GCRecord: ctx.newGCRecord()});
                    }else{
                        if (s.anteprimas) anteprima = false;
                        await ctx.tblGalleriaAnnuncio.create({galleria: galleryId, schedulazione: s.id, isAnteprima: anteprima});
                        s.anteprimas = true;
                    }
                }else{
                    if (hiddenFlags[i] == "true"){
                        if(!gS.GCRecord) await gS.update({galleria: galleryId, schedulazione: s.id, GCRecord: ctx.newGCRecord()});
                    }else{
                        if (s.anteprimas) anteprima = false;
                        await gS.update({galleria: galleryId, schedulazione: s.id, GCRecord: null, isAnteprima: anteprima});
                        s.anteprimas = true;
                    }                    
                }
            }
        }
        if (isMoscarossa) {
            const activeIds = origins.filter((id, index) => id && hiddenFlags[index] !== "true")
                .map((id) => `${id}`);
            const activeSet = new Set(activeIds);
            const requestedPreviewId = `${req.body.previewGalleryId || ""}`.trim();
            for (const schedule of scheduled) {
                if (schedule.remotePostID && isMoscarossaExpired(schedule)) {
                    expiredSchedulesSkipped += 1;
                    continue;
                }
                const selected = await schedule.getTblGalleriaAnnuncios({ where: { GCRecord: null } });
                const retained = selected.filter((image) => activeSet.has(`${image.galleria}`));
                const galleryChanged = retained.length !== selected.length ||
                    retained.some((image) => replacedGalleryIds.has(`${image.galleria}`));
                for (const image of selected) {
                    if (!activeSet.has(`${image.galleria}`)) {
                        await image.update({ GCRecord: ctx.newGCRecord() });
                    }
                }
                // A gallery save must not replace a timeslot's own image selection or
                // silently turn its first photo into the preview.
                const oldPreview = retained.find((image) => image.isAnteprima)?.galleria;
                const requestedIsSelected = retained.some((image) => `${image.galleria}` === requestedPreviewId);
                const previewId = requestedIsSelected ? requestedPreviewId
                    : `${oldPreview || retained[0]?.galleria || ""}`;
                for (const image of retained) {
                    const shouldPreview = `${image.galleria}` === previewId;
                    if (Boolean(image.isAnteprima) !== shouldPreview) {
                        await image.update({ isAnteprima: shouldPreview });
                    }
                }
                if ((galleryChanged || `${oldPreview || ""}` !== previewId) && schedule.remotePostID &&
                    !["DELETE", "CLOSE", "CLOSED", "DELETED"].includes(`${schedule.state || ""}`)) {
                    await schedule.update({
                        state: "EDIT",
                        errorReason: galleryChanged ? "MOSCAROSSA_GALLERY_PENDING" : "MOSCAROSSA_PREVIEW_PENDING"
                    });
                }
            }
        }
    }
        
    if (isMoscarossa) return res.status(201).json({ expiredSchedulesSkipped });
    return res.sendStatus(201);

});

function sanitizeFileName(fileName) {
    return fileName.replace(/\s+/g, '_').replace(/[()]/g, '');
}

async function writeImgFile(file, i, id, phone){
    try {
        // Sanitize the file name
        const extension = file.mimetype.split("/")[1];
        let safeFileName = `${i}.${extension}`;
        safeFileName = sanitizeFileName(safeFileName); // Ensure valid file name

        lstFiles = fs.readdirSync(`${rootPath}/girls/${phone}/pics`);

        if (lstFiles.includes(safeFileName)) {
            return await writeImgFile(file, i + 1, id, phone); // Recursively find a new valid file name
        }

        // Write the sanitized file name
        fs.writeFileSync(`${rootPath}/girls/${phone}/pics/${safeFileName}`, file.buffer);

        // Update the database with the sanitized file name
        await ctx.tblGalleria.update({
            src: `/images/get?phone=${phone}&index=${i}`,
            GCRecord: null,
            origin: safeFileName
        }, {
            where: { id: id }
        });
    } catch (err) {
        console.log("Error in Images.js: " + err);
        await writeImgFile(file, i + 1, id, phone); // Retry with next index in case of error
    }
}

router.get("/get", async (req, res) => {
    try {
        console.log("Request received:", req.query);

        // Validate query parameters
        if (!req.query.phone || !req.query.index || !req.query.id) {
            console.log("Missing required query parameters", req.query);
            return res.sendStatus(400); // Bad Request
        }

        // Check if the folder exists and read files
        const picsPath = `${rootPath}/girls/${req.query.phone}/pics`;
        console.log(`Checking if folder exists: ${picsPath}`);

        if (!fs.existsSync(picsPath)) {
            console.log(`Folder not found: ${picsPath}`);
            return res.sendStatus(404); // Folder not found
        }

        console.log(`Folder found: ${picsPath}. Reading files...`);
        const files = fs.readdirSync(picsPath);
        console.log("Files found:", files);

        if (!files || files.length === 0) {
            console.log("No files found in folder");
            return res.sendStatus(404); // No files found
        }

        // Query the database for the gallery entry
        console.log(`Querying database for gallery entry with ID: ${req.query.id}`);
        const g = await ctx.tblGalleria.findOne({ where: { id: req.query.id } });

        if (!g) {
            console.log(`Gallery entry not found for ID: ${req.query.id}`);
            return res.sendStatus(404); // Gallery entry not found
        }

        // console.log(`Gallery entry found:`, g);
        console.log("Searching for image file with origin:", g.origin);

        // Find the file that starts with the gallery's origin
        for (let file of files) {
            if (file.startsWith(g.origin)) {
                console.log(`Image found: ${file}, sending file...`);
                return res.sendFile(`${picsPath}/${g.origin}`); // Send the file
            }
        }

        console.log("Image not found in folder");
        res.sendStatus(404); // Image not found
    } catch (err) {
        console.error("Error in /get route:", err);
        res.sendStatus(500); // Internal Server Error
    }
});


router.post("/addImg", async (req, res) => {
    if (!req.body.donna || !req.body.src || !req.body.origin) return res.sendStatus(400);
    var img = await ctx.tblGalleria.create({
        donna: req.body.donna,
        src: req.body.src,
        origin: req.body.origin,
        isHidden: false,
        GCRecord: ctx.newGCRecord()
    });
    res.json(img);
});

router.post("/romoveImg", async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var img = await ctx.tblGalleria.update({
        isHidden: true
    },{
        where:{
            id: req.body.id
        }
    });
    res.sendStatus(200);
});

router.post("/updateImgPhone", async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var img = await ctx.tblGalleria.update({
        applyPhone: req.body.applyPhone
    },{
        where:{
            id: req.body.id
        }
    });
    res.sendStatus(200);
});

router.post("/updateImgCrop", async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var img = await ctx.tblGalleria.update({
        crop: req.body.crop
    },{
        where:{
            id: req.body.id
        }
    });
    res.sendStatus(200);
});

router.post("/removeDefImg", async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var img = await ctx.tblGalleria.update({
        GCRecord: ctx.newGCRecord()
    },{
        where:{
            id: req.body.id
        }
    });
    res.sendStatus(200);
});

router.post("/restoreImg", async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var img = await ctx.tblGalleria.update({
        isHidden: false
    },{
        where:{
            id: req.body.id
        }
    });
    res.sendStatus(200);
});

module.exports = router;
