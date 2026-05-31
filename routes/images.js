const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const fs = require("fs");
const { authenticateKey } = require("../lib/authentication");
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

router.post("/update", upload.array("imgs"), async (req, res) => {
    if (!req.query.phone) return res.sendStatus(400);
    if (!req.query.ann) return res.sendStatus(400);

    // Creating the folder if it does not exist
    if (!fs.existsSync(`${rootPath}/girls/${req.query.phone}`))
        fs.mkdirSync(`${rootPath}/girls/${req.query.phone}`);
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
        var scheduled = await annuncio.getTblSchedulazionis({where:{data :{[Op.gt]: sevenDay}}});
        for(s of scheduled){
            await ctx.tblGalleriaAnnuncio.update({GCRecord: ctx.newGCRecord()}, {where:{schedulazione: s.id}});
        }
        // Writing the image files
        for (let i = 0; i < req.files.length; i++){
            if (req.body.isNew[i] == "true") await writeImgFile(req.files[i], i, req.body.origin[i], req.query.phone);
            for(s of scheduled){
                var anteprima = true;
                var gS = await ctx.tblGalleriaAnnuncio.findOne({where:{galleria: req.body.origin[i], schedulazione: s.id}});
                if (!gS){
                    if (req.body.hidden[i] == "true"){
                        await ctx.tblGalleriaAnnuncio.create({galleria: req.body.origin[i], schedulazione: s.id, GCRecord: ctx.newGCRecord()});
                    }else{
                        if (s.anteprimas) anteprima = false;
                        await ctx.tblGalleriaAnnuncio.create({galleria: req.body.origin[i], schedulazione: s.id, isAnteprima: anteprima});
                        s.anteprimas = true;
                    }
                }else{
                    if (req.body.hidden[i] == "true"){
                        if(!gS.GCRecord) await gS.update({galleria: req.body.origin[i], schedulazione: s.id, GCRecord: ctx.newGCRecord()});
                    }else{
                        if (s.anteprimas) anteprima = false;
                        await gS.update({galleria: req.body.origin[i], schedulazione: s.id, GCRecord: null, isAnteprima: anteprima});
                        s.anteprimas = true;
                    }                    
                }
            }
        }
    }
        
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