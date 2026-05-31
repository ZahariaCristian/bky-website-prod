const router = require("express").Router();
const scraper = require("../lib/scraper/bakecaincontrii");
const scrapeBakeca = require("../lib/scraper/backer");
const scrapeMegaescort = require("../lib/scraper/me");
const scrapeTrovagnocca = require("../lib/scraper/trovagnocca");
const axios = require("axios");
const fs = require("fs");
const { authenticateKey } = require("../lib/authentication");
const ctx = require("../ctx/model");
const { dirname, basename } = require('path');
const { platform } = require("os");
const appDir = dirname((require.main && require.main.filename) || __filename);
var rootPath;
const Op = ctx.model.Sequelize.Op;

if (process.env.PROD == 0) {
    rootPath = `${appDir}`
} else {
    rootPath = `${process.env.APP_PATH_PRODUCTION}`
}

const GLOBAL_PATH = process.env.Global_Path.trim();

const sortSchedule = (schedule) => {
    const currentTime = new Date(new Date().toLocaleDateString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }));
    const sortedSchedule = {};
    for (let k in schedule) {
        if (new Date(k) < currentTime) continue;
        sortedSchedule[k] = schedule[k];
    };
    return sortedSchedule;
};

router.post("/setExpiresAt", authenticateKey, async (req, res) => {
    try {
        const { annuncioId, expiresAt } = req.body;
        if (!annuncioId || !expiresAt) {
            return res.status(400).json({ success: false, error: "annuncioId and expiresAt required" });
        }

        const annuncio = await ctx.tblAnnunci.findOne({ where: { id: annuncioId } });
        if (!annuncio) return res.status(404).json({ success: false, error: "Annuncio not found" });

        annuncio.expiresAt = expiresAt.toString();
        annuncio.notified = false;
        await annuncio.save();

        res.json({ success: true });
    } catch (err) {
        console.error("Error in /setExpiresAt:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

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
        const { annuncioId } = req.body;
        if (!annuncioId) return res.status(400).json({ success: false, error: "annuncioId required" });
        const annuncio = await ctx.tblAnnunci.findOne({ where: { id: annuncioId } });
        if (!annuncio) return res.status(404).json({ success: false, error: "Annuncio not found" });
        res.json({ success: true, annuncio });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/currentUser', async (req, res) => {
    try {
        const userid = req.session.userid;
        if (!userid) return res.status(401).json({ error: "User not authenticated." });

        const user = await ctx.tblUser.findByPk(userid);
        if (!user) return res.status(404).json({ error: "User not found." });

        res.json({ username: user.userName, userId: user.id });
    } catch (error) {
        console.error("Error fetching current user:", error);
        res.status(500).send("Server error");
    }
});

router.post('/getReports', async (req, res) => {
    try {
        if (!ctx.Report) return res.json({ reports: [] });
        const { phone } = req.body;
        const reports = await ctx.Report.findAll({
            where: { phone },
            order: [['date', 'DESC']]
        });
        res.json({ reports });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

router.post('/getAllReports', async (req, res) => {
    try {
        const userid = req.session.userid;
        if (!userid) return res.status(401).json({ error: "User not authenticated." });

        const user = await ctx.tblUser.findByPk(userid);
        if (!user) return res.status(404).json({ error: "User not found." });
        if (!ctx.Report) return res.json({ reports: [] });

        const reports = await ctx.Report.findAll({
            order: [['date', 'DESC']],
            raw: true
        });

        const maskedReports = reports.map(report => {
            if (report.user !== user.userName) {
                const visiblePart = report.phone?.substring(0, 5) || "";
                const maskedPart = "*".repeat(Math.max(report.phone?.length - 5, 0));
                return { ...report, phone: visiblePart + maskedPart };
            }
            return report;
        });

        res.json({ reports: maskedReports });
    } catch (error) {
        console.error("Error loading reports:", error);
        res.status(500).send("Server error");
    }
});

router.post('/addReport', async (req, res) => {
    try {
        const userid = req.session.userid;
        if (!userid) return res.status(401).json({ error: "User not authenticated." });

        const user = await ctx.tblUser.findByPk(userid);
        if (!user) return res.status(404).json({ error: "User not found." });
        if (!ctx.Report) return res.status(500).json({ error: "Report model is not configured." });

        const { phone, description, dangerlevel } = req.body;
        if (!phone || !description) return res.status(400).json({ error: "Missing phone or description." });

        const existingReports = await ctx.Report.findAll({ where: { phone } });
        const oldphone = existingReports.find((rpt) => rpt.oldphone)?.oldphone || null;

        await ctx.Report.create({
            phone,
            oldphone,
            description,
            date: new Date(),
            solved: false,
            user: user.userName,
            dangerlevel
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error in /addReport:", error);
        res.status(500).send("Server error");
    }
});

router.post('/solveReport', async (req, res) => {
    try {
        const { id } = req.body;
        if (!ctx.Report) return res.status(500).json({ error: "Report model is not configured." });
        await ctx.Report.update({ solved: true }, { where: { id } });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
});

router.post('/deleteReport', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing report ID." });
        if (!ctx.Report) return res.status(500).json({ error: "Report model is not configured." });

        const deletedCount = await ctx.Report.destroy({ where: { id } });
        if (deletedCount === 0) return res.status(404).json({ error: "Report not found." });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error in /deleteReport:", error);
        res.status(500).send("Server error");
    }
});

router.post("/savecropanteprima", authenticateKey, async (req, res) => {
    const { id, crop } = req.body;
    if (!id || !crop || typeof crop !== "object") return res.sendStatus(400);

    try {
        await ctx.tblGalleria.update({ crop: JSON.stringify(crop) }, { where: { id } });
        res.sendStatus(200);
    } catch (err) {
        console.error("Error saving crop:", err);
        res.sendStatus(500);
    }
});

router.post("/resetcropanteprima", authenticateKey, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.sendStatus(400);

    try {
        await ctx.tblGalleria.update({ crop: JSON.stringify({}) }, { where: { id } });
        res.sendStatus(200);
    } catch (err) {
        console.error("Error resetting crop:", err);
        res.sendStatus(500);
    }
});

router.post("/getcropanteprima", authenticateKey, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.sendStatus(400);

    try {
        const record = await ctx.tblGalleria.findOne({ where: { id }, attributes: ['crop'] });
        if (!record) return res.sendStatus(404);

        const crop = record.crop ? JSON.parse(record.crop) : {};
        res.status(200).json({ crop });
    } catch (err) {
        console.error("Error fetching crop:", err);
        res.sendStatus(500);
    }
});

const getGalleryPhoneImageSrc = (phone, origin) => {
    const extensionMatch = /(?:\.([^.]+))?$/.exec(origin || "");
    const imageIndex = extensionMatch && extensionMatch[1]
        ? origin.replace("." + extensionMatch[1], "")
        : origin;
    return `/images/get?phone=${phone}&index=${imageIndex}`;
};

const getGalleryOrderIndex = (gallery) => {
    const originIndex = parseInt(`${gallery.origin || ""}`.split(".")[0], 10);
    if (!Number.isNaN(originIndex)) return originIndex;

    const srcMatch = `${gallery.src || ""}`.match(/[?&]index=([^&]+)/);
    const srcIndex = srcMatch ? parseInt(srcMatch[1], 10) : NaN;
    return Number.isNaN(srcIndex) ? Number.MAX_SAFE_INTEGER : srcIndex;
};

const moveGalleryFileToPhone = (oldPhone, newPhone, origin) => {
    const source = `${rootPath}/girls/${oldPhone}/pics/${origin}`;
    const destination = `${rootPath}/girls/${newPhone}/pics/${origin}`;

    if (fs.existsSync(source)) {
        const destinationDir = `${rootPath}/girls/${newPhone}/pics`;
        if (!fs.existsSync(destinationDir)) {
            fs.mkdirSync(destinationDir, { recursive: true });
        }
        if (source !== destination) {
            fs.renameSync(source, destination);
        }
        return { moved: true, destinationExists: true };
    }

    return { moved: false, destinationExists: fs.existsSync(destination) };
};

const normalizeMegaescortCategory = (category = "") => {
    const normalized = category.toLowerCase();
    if (normalized.includes("trans")) return "TRANS";
    if (normalized.includes("copp") || normalized === "coppia") return "COPPIE";
    if (normalized.includes("uomodonna") || normalized.includes("uomo donna") || normalized.includes("uomo cerca donna") || normalized.includes("gigolo")) return "UOMODONNA";
    if (normalized.includes("uomouomo") || normalized.includes("uomo uomo") || normalized.includes("gay")) return "UOMOUOMO";
    if (normalized.includes("donnadonna") || normalized.includes("donna donna") || normalized.includes("donna cerca donna") || normalized.includes("lesbo")) return "DONNADONNA";
    if (normalized.includes("amici") || normalized.includes("cerco amici")) return "AMICI";
    if (normalized.includes("anima gemella") || normalized.includes("animagemella")) return "ANIMAGEMELLA";
    if (normalized.includes("massaggi") || normalized.includes("benessere")) return "MASSAGGI";
    return "DONNAUOMO";
};

const normalizePanelPlatform = (panel) => {
    const normalized = `${panel || ""}`.toLowerCase();
    if (normalized === "me" || normalized === "megaescort") return "megaescort";
    return normalized || "bakecaincontrii";
};

const parseAgeValue = (value) => {
    const match = `${value || ""}`.match(/\d+/);
    return match ? Number(match[0]) : null;
};

const getMegaescortAttribute = (attributes = {}, names = []) => {
    const normalizedNames = names.map((name) => name.toLowerCase());
    for (const [key, value] of Object.entries(attributes)) {
        const normalizedKey = key.toLowerCase();
        if (normalizedNames.some((name) => normalizedKey.includes(name))) {
            return value;
        }
    }
    return "";
};

const normalizeTrovagnoccaNationality = (value = "") => {
    const rawValue = Array.isArray(value) ? value.find(Boolean) : value;
    const normalized = `${rawValue || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z_ ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) return "";
    if (normalized.startsWith("nationality_")) return normalized;

    const nationalityMap = {
        albanese: "nationality_albanian",
        albanian: "nationality_albanian",
        americana: "nationality_american",
        americano: "nationality_american",
        american: "nationality_american",
        araba: "nationality_arabic",
        arabo: "nationality_arabic",
        arabic: "nationality_arabic",
        argentina: "nationality_argentinian",
        argentino: "nationality_argentinian",
        argentinian: "nationality_argentinian",
        australiana: "nationality_australian",
        australiano: "nationality_australian",
        australian: "nationality_australian",
        austriaca: "nationality_austrian",
        austriaco: "nationality_austrian",
        austrian: "nationality_austrian",
        bangladese: "nationality_bangladeshi",
        bangladeshi: "nationality_bangladeshi",
        belga: "nationality_belgian",
        belgian: "nationality_belgian",
        boliviana: "nationality_bolivian",
        boliviano: "nationality_bolivian",
        bolivian: "nationality_bolivian",
        bosniaca: "nationality_bosnian",
        bosniaco: "nationality_bosnian",
        bosnian: "nationality_bosnian",
        brasiliana: "nationality_brazilian",
        brasiliano: "nationality_brazilian",
        brazilian: "nationality_brazilian",
        bulgara: "nationality_bulgarian",
        bulgaro: "nationality_bulgarian",
        bulgarian: "nationality_bulgarian",
        canadese: "nationality_canadian",
        canadian: "nationality_canadian",
        ceca: "nationality_czech",
        ceco: "nationality_czech",
        czech: "nationality_czech",
        cilena: "nationality_chilean",
        cileno: "nationality_chilean",
        chilean: "nationality_chilean",
        cinese: "nationality_chinese",
        chinese: "nationality_chinese",
        colombiana: "nationality_colombian",
        colombiano: "nationality_colombian",
        colombian: "nationality_colombian",
        costaricana: "nationality_costa_rican",
        costaricano: "nationality_costa_rican",
        "costa rican": "nationality_costa_rican",
        croata: "nationality_croatian",
        croatian: "nationality_croatian",
        cubana: "nationality_cuban",
        cubano: "nationality_cuban",
        cuban: "nationality_cuban",
        danese: "nationality_danish",
        danish: "nationality_danish",
        dominicana: "nationality_dominican",
        dominicano: "nationality_dominican",
        dominican: "nationality_dominican",
        ecuadoriana: "nationality_ecuadorian",
        ecuadoriano: "nationality_ecuadorian",
        ecuadorian: "nationality_ecuadorian",
        estone: "nationality_estonian",
        estonian: "nationality_estonian",
        filippina: "nationality_filipino",
        filippino: "nationality_filipino",
        filipino: "nationality_filipino",
        finlandese: "nationality_finnish",
        finnish: "nationality_finnish",
        francese: "nationality_french",
        french: "nationality_french",
        giamaicana: "nationality_jamaican",
        giamaicano: "nationality_jamaican",
        jamaican: "nationality_jamaican",
        giapponese: "nationality_japanese",
        japanese: "nationality_japanese",
        greca: "nationality_greek",
        greco: "nationality_greek",
        greek: "nationality_greek",
        guatemalteca: "nationality_guatemalan",
        guatemalteco: "nationality_guatemalan",
        guatemalan: "nationality_guatemalan",
        haitiana: "nationality_haitian",
        haitiano: "nationality_haitian",
        haitian: "nationality_haitian",
        honduregna: "nationality_honduran",
        honduregno: "nationality_honduran",
        honduran: "nationality_honduran",
        indiana: "nationality_indian",
        indiano: "nationality_indian",
        indian: "nationality_indian",
        indonesiana: "nationality_indonesian",
        indonesiano: "nationality_indonesian",
        indonesian: "nationality_indonesian",
        inglese: "nationality_english",
        english: "nationality_english",
        irlandese: "nationality_irish",
        irish: "nationality_irish",
        italiana: "nationality_italian",
        italiano: "nationality_italian",
        italian: "nationality_italian",
        keniota: "nationality_kenyan",
        kenyan: "nationality_kenyan",
        lettone: "nationality_latvian",
        latvian: "nationality_latvian",
        lituana: "nationality_lithuanian",
        lituano: "nationality_lithuanian",
        lithuanian: "nationality_lithuanian",
        maldiviana: "nationality_maldivian",
        maldiviano: "nationality_maldivian",
        maldivian: "nationality_maldivian",
        malese: "nationality_malaysian",
        malaysian: "nationality_malaysian",
        marocchina: "nationality_moroccan",
        marocchino: "nationality_moroccan",
        moroccan: "nationality_moroccan",
        messicana: "nationality_mexican",
        messicano: "nationality_mexican",
        mexican: "nationality_mexican",
        moldava: "nationality_moldovan",
        moldavo: "nationality_moldovan",
        moldovan: "nationality_moldovan",
        neozelandese: "nationality_new_zealander",
        "new zealander": "nationality_new_zealander",
        nicaraguense: "nationality_nicaraguan",
        nicaraguan: "nationality_nicaraguan",
        nigeriana: "nationality_nigerian",
        nigeriano: "nationality_nigerian",
        nigerian: "nationality_nigerian",
        norvegese: "nationality_norwegian",
        norwegian: "nationality_norwegian",
        olandese: "nationality_dutch",
        dutch: "nationality_dutch",
        pachistana: "nationality_pakistani",
        pachistano: "nationality_pakistani",
        pakistani: "nationality_pakistani",
        panamense: "nationality_panamanian",
        panamanian: "nationality_panamanian",
        paraguayana: "nationality_paraguayan",
        paraguayano: "nationality_paraguayan",
        paraguayan: "nationality_paraguayan",
        peruviana: "nationality_peruvian",
        peruviano: "nationality_peruvian",
        peruvian: "nationality_peruvian",
        polacca: "nationality_polish",
        polacco: "nationality_polish",
        polish: "nationality_polish",
        portoghese: "nationality_portuguese",
        portuguese: "nationality_portuguese",
        rumena: "nationality_romanian",
        rumeno: "nationality_romanian",
        romanian: "nationality_romanian",
        russa: "nationality_russian",
        russo: "nationality_russian",
        russian: "nationality_russian",
        senegalese: "nationality_senegalese",
        serba: "nationality_serbian",
        serbo: "nationality_serbian",
        serbian: "nationality_serbian",
        singaporese: "nationality_singaporean",
        singaporean: "nationality_singaporean",
        spagnola: "nationality_spanish",
        spagnolo: "nationality_spanish",
        spanish: "nationality_spanish",
        sudafricana: "nationality_south_african",
        sudafricano: "nationality_south_african",
        "south african": "nationality_south_african",
        svedese: "nationality_swedish",
        swedish: "nationality_swedish",
        svizzera: "nationality_swiss",
        svizzero: "nationality_swiss",
        swiss: "nationality_swiss",
        thailandese: "nationality_thai",
        thai: "nationality_thai",
        tedesca: "nationality_german",
        tedesco: "nationality_german",
        german: "nationality_german",
        tunisina: "nationality_tunisian",
        tunisino: "nationality_tunisian",
        tunisian: "nationality_tunisian",
        turca: "nationality_turkish",
        turco: "nationality_turkish",
        turkish: "nationality_turkish",
        ucraina: "nationality_ukrainian",
        ucraino: "nationality_ukrainian",
        ukrainian: "nationality_ukrainian",
        ungherese: "nationality_hungarian",
        hungarian: "nationality_hungarian",
        uruguaiana: "nationality_uruguayan",
        uruguaiano: "nationality_uruguayan",
        uruguayan: "nationality_uruguayan",
        venezuelana: "nationality_venezuelan",
        venezuelano: "nationality_venezuelan",
        venezuelan: "nationality_venezuelan",
        vietnamita: "nationality_vietnamese",
        vietnamese: "nationality_vietnamese"
    };

    if (nationalityMap[normalized]) return nationalityMap[normalized];

    const matchedKey = Object.keys(nationalityMap)
        .sort((a, b) => b.length - a.length)
        .find((key) => new RegExp(`(^| )${key}( |$)`).test(normalized));

    return matchedKey ? nationalityMap[matchedKey] : "";
};

const findTrovagnoccaNationalityCandidate = (attributes = {}) => {
    const values = [];
    const collect = (value) => {
        if (Array.isArray(value)) {
            value.forEach(collect);
            return;
        }
        if (value && typeof value === "object") {
            Object.entries(value).forEach(([key, nestedValue]) => {
                values.push(key);
                collect(nestedValue);
            });
            return;
        }
        if (value !== null && value !== undefined) values.push(`${value}`);
    };

    collect(attributes);

    return values.find((value) => normalizeTrovagnoccaNationality(value)) || "";
};

const buildTrovagnoccaContactNote = (data = {}) => {
    return JSON.stringify({
        trovagnocca: {
            telegram: Boolean(data.telegram || data.telegramUrl),
            telegramNumber: data.telegram || "",
            telegramUrl: data.telegramUrl || ""
        }
    });
};

const parseTrovagnoccaContactNote = (note) => {
    try {
        const parsed = JSON.parse(note || "{}");
        return parsed.trovagnocca || {};
    } catch {
        return {};
    }
};

const buildMegaescortApiNote = (scrapingResult = {}) => {
    const attributes = scrapingResult.attributes || {};
    const tags = {
        "età": getMegaescortAttribute(attributes, ["età", "eta", "anni"]),
        "nazionalità": getMegaescortAttribute(attributes, ["nazionalità", "nazionalita"]),
        "capelli": getMegaescortAttribute(attributes, ["capelli"]),
        "corporatura": getMegaescortAttribute(attributes, ["corporatura", "fisico"]),
        "seno": getMegaescortAttribute(attributes, ["seno"]),
        "altezza": getMegaescortAttribute(attributes, ["altezza"]),
        "servizio": getMegaescortAttribute(attributes, ["servizio"])
    };

    Object.keys(tags).forEach((key) => {
        if (!tags[key]) delete tags[key];
    });

    return JSON.stringify({
        megaescortApi: {
            zone: scrapingResult.zone || getMegaescortAttribute(attributes, ["zona", "zone"]),
            other_cities: [],
            tags
        }
    });
};

router.post("/getByUrl", authenticateKey, async (req, res) => {
    try {
        // Check if URL is provided
        if (!req.body.url) {
            console.error("Error: Missing URL in request body.");
            return res.status(400).json({ error: "Missing URL in request body." });
        }

        // Get user information from session
        const userid = req.session.userid;
        if (!userid) {
            console.error("Error: User not authenticated.");
            return res.status(401).json({ error: "User not authenticated." });
        }

        const user = await ctx.tblUser.findOne({ where: { OID: userid } });
        if (!user) {
            console.error(`Error: User with ID ${userid} not found.`);
            return res.status(404).json({ error: "User not found." });
        }

        const groupM = await user.getGroup();

        // Scrape the data from the provided URL
        const scrapingResult = await scraper.scrape(req.body.url);
        //console.log("Scraping result:", scrapingResult);

        if (!scrapingResult) {
            console.error("Error: Scraping failed, no data returned.");
            return res.status(400).json({ error: "Scraping failed." });
        }

        // Handle case where no phone number is scraped
        if (!scrapingResult.phone) {
            return res.status(200).json(scrapingResult);
        }

        let donna;
        let tmpPhotoFolder = null;

        // Check if the phone number is already in the database
        if (scrapingResult.checkPhone) {
            donna = await ctx.tblDonne.findOne({
                where: { phone: scrapingResult.phone, GCRecord: null }
            });

            // If donna doesn't exist, create a new record
            if (!donna) {
                donna = await ctx.tblDonne.create({
                    name: "NUOVA CLIENTE CAMBIARE NOME",
                    city: scrapingResult.city,
                    years: scrapingResult.age,
                    phone: scrapingResult.phone,
                    isPhoneChecked: scrapingResult.checkPhone,
                    groupOwner: groupM.group
                });
            }
        } else {
            donna = {};
            donna.id = null;
            donna.phone = scrapingResult.phone;
            tmpPhotoFolder = donna.phone;
        }

        // Create directories if they don't exist
        const phoneDir = `${rootPath}/girls/${donna.phone}`;
        const picsDir = `${phoneDir}/pics`;

        if (!fs.existsSync(phoneDir)) fs.mkdirSync(phoneDir);
        if (!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        const hasWhatsapp = scrapingResult.whatsapp;

        // Find or create annuncio (ad) for the donna
        let annuncio = await ctx.tblAnnunci.findOne({
            where: { donna: donna.id, title: scrapingResult.title }
        });
        console.log("scraping results below:")
        console.log(scrapingResult)
        const scrapedCategory = normalizeMegaescortCategory(scrapingResult.category || req.body.url);
        if (!annuncio) {
            annuncio = await ctx.tblAnnunci.create({
                title: scrapingResult.title,
                city: scrapingResult.city,
                location: scrapingResult.location,
                description: scrapingResult.description,
                donna: donna.id,
                hasWhatapp: hasWhatsapp,
                categorie: scrapedCategory,
                sono: scrapedCategory,
                groupOwner: groupM.group,
                editedBy: userid,
                cost: 0,
                phoneTmp: tmpPhotoFolder
            });
        } else if (!donna.id) {
            // Update the annuncio if donna ID is null
            await annuncio.update({ phoneTmp: tmpPhotoFolder });
        } else {
            await annuncio.update({
                categorie: normalizeMegaescortCategory(annuncio.categorie || scrapedCategory),
                sono: normalizeMegaescortCategory(annuncio.sono || scrapedCategory)
            });
        }

        // Process images
        const re = /(?:\.([^.]+))?$/;
        let i = 0;

        if (scrapingResult.images && scrapingResult.images.length > 0) {
            //console.log("Images found:", scrapingResult.images);
            for (const photo of scrapingResult.images) {
                const fn = i;
                let extension = re.exec(photo)[1] || 'jpg'; // Default to 'jpg' if no extension is found

                if (extension.indexOf("?") !== -1) {
                    extension = extension.substring(0, extension.indexOf("?"));
                }

                // Download the file
                await downloadFile(photo, async (respFile, args) => {
                    const filePath = `${picsDir}/${args.fn}.${args.extension}`;

                    if (!fs.existsSync(filePath)) {
                        fs.writeFile(filePath, respFile, async (err) => {
                            if (err) {
                                console.error(`Error writing file ${filePath}:`, err);
                                return;
                            }

                            // Save the image info in the gallery (tblGalleria)
                            await ctx.tblGalleria.create({
                                donna: donna.id,
                                src: `/images/get?phone=${donna.phone}&index=${args.fn}`,
                                GCRecord: null,
                                origin: `${args.fn}.${args.extension}`,
                                isHidden: false,
                            });
                        });
                    }
                }, { fn, extension });
                i++;
            }
        } else {
            console.error("No images found in scraping result.");
        }

        // Return success response
        return res.json({ id: annuncio.id, donna: donna.id });

    } catch (error) {
        console.error("Error in /getByUrl route:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

// scrapeBakeca
router.post("/scrapeBakeca", authenticateKey, async (req, res) => {
    try {
        // Check if URL is provided
        if (!req.body.url) {
            console.error("Error: Missing URL in request body.");
            return res.status(400).json({ error: "Missing URL in request body." });
        }

        // Get user information from session
        const userid = req.session.userid;
        if (!userid) {
            console.error("Error: User not authenticated.");
            return res.status(401).json({ error: "User not authenticated." });
        }

        const user = await ctx.tblUser.findOne({ where: { OID: userid } });
        if (!user) {
            console.error(`Error: User with ID ${userid} not found.`);
            return res.status(404).json({ error: "User not found." });
        }

        const groupM = await user.getGroup();

        //If don't have resule, it will do again maxium 3times
        console.log(req.body.url, "scrape bakeca.it");

        const MAX_RETRIES = 3;
        let scrapingResult = null;
        for (let i = 1; i <= MAX_RETRIES; i++) {
            try {
                console.log(`Scraping attempt ${i}...`);
                const result = await scrapeBakeca.scrape(req.body.url);
                const mergeImages = (oldArr = [], newArr = []) => {
                    return [...new Set([...(oldArr || []), ...(newArr || [])])];
                };

                if (result) {
                    if (!scrapingResult) {
                        scrapingResult = {
                            title: result.title || "",
                            description: result.description || "",
                            city: result.city || "",
                            phone: result.phone || "",
                            images: Array.isArray(result.images) ? result.images : [],
                            imageFiles: Array.isArray(result.imageFiles) ? result.imageFiles : []
                        };
                    } else {
                        scrapingResult = {
                            title: result.title || scrapingResult.title,
                            description: result.description || scrapingResult.description,
                            city: result.city || scrapingResult.city,
                            phone: result.phone || scrapingResult.phone,

                            images: Array.isArray(result.images) && result.images.length > 0
                                ? result.images
                                : scrapingResult.images,

                            // ✅ MERGE instead of replace
                            imageFiles: mergeImages(
                                scrapingResult.imageFiles,
                                result.imageFiles
                            )
                        };
                    }

                    const hasImages = Array.isArray(scrapingResult.images) && scrapingResult.images.length > 0;
                    const hasImageFiles = Array.isArray(scrapingResult.imageFiles) && scrapingResult.imageFiles.length > 0 && scrapingResult.images.length == scrapingResult.imageFiles.length;

                    if (hasImageFiles) {
                        console.log("Scraping success with imageFiles:", scrapingResult.imageFiles.length);
                        break;
                    }
                    if (hasImages) {
                        console.warn(`Attempt ${i}: images exist but imageFiles still empty → retry`);
                    }
                }
            } catch (err) {
                console.error(`Attempt ${i} error:`, err.message);
            }
            if (i < MAX_RETRIES) {
                await new Promise(res => setTimeout(res, 2000 * i));
            }
        }

        // ❌ After 3 attempts → still no result
        if (!scrapingResult) {
            console.error("Error: Scraping failed, no data returned.");
            return res.status(400).json({ error: "Scraping failed." });
        }

        // Handle case where no phone number is scraped
        // if (!scrapingResult.phone) {
        //     return res.status(200).json(scrapingResult);
        // }

        let donna;
        let tmpPhotoFolder = null;

        // Check if the phone number is already in the database
        // if (scrapingResult.checkPhone) {
        donna = await ctx.tblDonne.findOne({
            where: { phone: scrapingResult.phone, GCRecord: null }
        });

        // If donna doesn't exist, create a new record
        if (!donna) {
            donna = await ctx.tblDonne.create({
                name: "NUOVA CLIENTE CAMBIARE NOME",
                city: scrapingResult.city,
                // years: scrapingResult.age,
                phone: scrapingResult.phone,
                // isPhoneChecked: scrapingResult.checkPhone,
                groupOwner: groupM.group
            });
        }
        // } else {
        //     donna = {};
        //     donna.id = null;
        //     donna.phone = scrapingResult.phone;
        //     tmpPhotoFolder = donna.phone;
        // }

        // Create directories if they don't exist
        const phoneDir = `${rootPath}/girls/${donna.phone}`;
        const picsDir = `${phoneDir}/pics`;
        if (!fs.existsSync(phoneDir)) fs.mkdirSync(phoneDir);
        if (!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        // const hasWhatsapp = scrapingResult.whatsapp;
        // Find or create annuncio (ad) for the donna
        let annuncio = await ctx.tblAnnunci.findOne({
            where: { donna: donna.id, title: scrapingResult.title }
        });
        // console.log("scraping results below:")
        // console.log(scrapingResult)
        if (!annuncio) {
            annuncio = await ctx.tblAnnunci.create({
                title: scrapingResult.title,
                city: scrapingResult.city,
                // location: scrapingResult.location,
                description: scrapingResult.description,
                donna: donna.id,
                // hasWhatapp: hasWhatsapp,
                categorie: normalizeMegaescortCategory(req.body.url),
                groupOwner: groupM.group,
                editedBy: userid,
                cost: 0,
                phoneTmp: tmpPhotoFolder
            });
        }

        if (scrapingResult.imageFiles && scrapingResult.imageFiles.length > 0) {
            for (let i = 0; i < scrapingResult.imageFiles.length; i++) {
                const fileName = scrapingResult.imageFiles[i];

                try {
                    // Ensure picsDir exists
                    // Copy file to picsDir (you can use fs.renameSync to move instead)

                    console.log(`✅ image name: ${fileName}`);
                    // Save the image info in tblGalleria
                    await ctx.tblGalleria.create({
                        donna: donna.id,
                        src: `/images/get?phone=${donna.phone}&index=${i}`,
                        GCRecord: null,
                        origin: basename(fileName),
                        isHidden: false,
                    });
                } catch (err) {
                    console.error(`❌ Failed processing ${fileName}:`, err.message);
                }
            }
        } else {
            console.error("No images found in scraping result.");
        }

        // Return success response
        return res.json({ id: annuncio.id, donna: donna.id });
    } catch (error) {
        console.error("Error in /scrapeBakeca route:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

router.post("/scrapeMegaescort", authenticateKey, async (req, res) => {
    try {
        if (!req.body.url) {
            console.error("Error: Missing URL in request body.");
            return res.status(400).json({ error: "Missing URL in request body." });
        }

        const userid = req.session.userid;
        if (!userid) {
            console.error("Error: User not authenticated.");
            return res.status(401).json({ error: "User not authenticated." });
        }

        const user = await ctx.tblUser.findOne({ where: { OID: userid } });
        if (!user) {
            console.error(`Error: User with ID ${userid} not found.`);
            return res.status(404).json({ error: "User not found." });
        }

        const groupM = await user.getGroup();

        console.log(req.body.url, "scrape megaescort.info");

        const MAX_RETRIES = 3;
        let scrapingResult = null;
        for (let i = 1; i <= MAX_RETRIES; i++) {
            try {
                console.log(`Megaescort scraping attempt ${i}...`);
                const result = await scrapeMegaescort.scrape(req.body.url);
                if (result) {
                    scrapingResult = {
                        title: result.title || "",
                        description: result.description || "",
                        city: result.city || "",
                        location: result.location || "",
                        phone: result.phone || "",
                        whatsapp: Boolean(result.whatsapp),
                        category: result.category || "",
                        attributes: result.attributes || {},
                        images: Array.isArray(result.images) ? result.images : [],
                        imageFiles: Array.isArray(result.imageFiles) ? result.imageFiles : []
                    };

                    const hasPhone = Boolean(scrapingResult.phone);
                    const hasImageFiles = scrapingResult.imageFiles.length > 0;
                    if (hasPhone && hasImageFiles) {
                        break;
                    }
                }
            } catch (err) {
                console.error(`Megaescort attempt ${i} error:`, err.message);
            }

            if (i < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 2000 * i));
            }
        }

        if (!scrapingResult) {
            console.error("Error: Megaescort scraping failed, no data returned.");
            return res.status(400).json({ error: "Scraping failed." });
        }

        if (!scrapingResult.phone) {
            console.error("Error: Megaescort scraping failed, no phone returned.");
            return res.status(500).json({ error: "Missing phone number." });
        }

        let donna = await ctx.tblDonne.findOne({
            where: { phone: scrapingResult.phone, GCRecord: null }
        });

        if (!donna) {
            const megaescortAge = getMegaescortAttribute(scrapingResult.attributes, ["età", "eta", "anni"]);
            donna = await ctx.tblDonne.create({
                name: "NUOVA CLIENTE CAMBIARE NOME",
                city: scrapingResult.city,
                phone: scrapingResult.phone,
                years: parseAgeValue(megaescortAge),
                groupOwner: groupM.group
            });
        }

        const phoneDir = `${rootPath}/girls/${donna.phone}`;
        const picsDir = `${phoneDir}/pics`;
        if (!fs.existsSync(phoneDir)) fs.mkdirSync(phoneDir);
        if (!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        let annuncio = await ctx.tblAnnunci.findOne({
            where: { donna: donna.id, title: scrapingResult.title }
        });

        if (!annuncio) {
            annuncio = await ctx.tblAnnunci.create({
                title: scrapingResult.title,
                city: scrapingResult.city,
                location: scrapingResult.location,
                description: scrapingResult.description,
                donna: donna.id,
                hasWhatapp: scrapingResult.whatsapp,
                categorie: normalizeMegaescortCategory(scrapingResult.category),
                sono: normalizeMegaescortCategory(scrapingResult.category),
                serviceNazionalita: getMegaescortAttribute(scrapingResult.attributes, ["nazionalità", "nazionalita"]),
                note: buildMegaescortApiNote(scrapingResult),
                groupOwner: groupM.group,
                editedBy: userid,
                cost: 0
            });
        } else {
            await annuncio.update({
                city: scrapingResult.city,
                location: scrapingResult.location,
                description: scrapingResult.description,
                hasWhatapp: scrapingResult.whatsapp,
                categorie: normalizeMegaescortCategory(scrapingResult.category),
                sono: normalizeMegaescortCategory(scrapingResult.category),
                serviceNazionalita: getMegaescortAttribute(scrapingResult.attributes, ["nazionalità", "nazionalita"]),
                note: buildMegaescortApiNote(scrapingResult),
                editedBy: userid
            });
        }

        if (scrapingResult.imageFiles && scrapingResult.imageFiles.length > 0) {
            for (let i = 0; i < scrapingResult.imageFiles.length; i++) {
                const fileName = scrapingResult.imageFiles[i];
                const origin = basename(fileName);
                await ctx.tblGalleria.create({
                    donna: donna.id,
                    src: `/images/get?phone=${donna.phone}&index=${i}`,
                    GCRecord: null,
                    origin,
                    isHidden: false,
                });
            }
        } else {
            console.error("No Megaescort images found in scraping result.");
        }

        return res.json({ id: annuncio.id, donna: donna.id });
    } catch (error) {
        console.error("Error in /scrapeMegaescort route:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

router.post("/scrapeTrovagnocca", authenticateKey, async (req, res) => {
    try {
        if (!req.body.url) {
            console.error("Error: Missing URL in request body.");
            return res.status(400).json({ error: "Missing URL in request body." });
        }

        const userid = req.session.userid;
        if (!userid) {
            console.error("Error: User not authenticated.");
            return res.status(401).json({ error: "User not authenticated." });
        }

        const user = await ctx.tblUser.findOne({ where: { OID: userid } });
        if (!user) {
            console.error(`Error: User with ID ${userid} not found.`);
            return res.status(404).json({ error: "User not found." });
        }

        const groupM = await user.getGroup();

        console.log(req.body.url, "scrape trovagnocca.com");

        const MAX_RETRIES = 3;
        let scrapingResult = null;
        for (let i = 1; i <= MAX_RETRIES; i++) {
            try {
                console.log(`Trovagnocca scraping attempt ${i}...`);
                const result = await scrapeTrovagnocca.scrape(req.body.url);
                if (result) {
                    scrapingResult = {
                        adId: result.adId || "",
                        title: result.title || "",
                        description: result.description || "",
                        age: result.age || result.attributes?.age || "",
                        city: result.city || "",
                        location: result.location || "",
                        zone: result.zone || "",
                        phone: result.phone || "",
                        whatsapp: Boolean(result.whatsapp),
                        telegram: result.telegram || "",
                        telegramUrl: result.telegramUrl || "",
                        hasTelegram: Boolean(result.telegram || result.telegramUrl),
                        category: result.category || "",
                        nationality: result.nationality || "",
                        attributes: result.attributes || {},
                        images: Array.isArray(result.images) ? result.images : [],
                        imageFiles: Array.isArray(result.imageFiles) ? result.imageFiles : []
                    };

                    if (scrapingResult.phone && scrapingResult.imageFiles.length > 0) {
                        break;
                    }
                }
            } catch (err) {
                console.error(`Trovagnocca attempt ${i} error:`, err.message);
            }

            if (i < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 2000 * i));
            }
        }

        if (!scrapingResult) {
            console.error("Error: Trovagnocca scraping failed, no data returned.");
            return res.status(400).json({ error: "Scraping failed." });
        }

        if (!scrapingResult.phone) {
            console.error("Error: Trovagnocca scraping failed, no phone returned.");
            return res.status(500).json({ error: "Missing phone number." });
        }

        let donna = await ctx.tblDonne.findOne({
            where: { phone: scrapingResult.phone, GCRecord: null }
        });

        if (!donna) {
            donna = await ctx.tblDonne.create({
                name: "NUOVA CLIENTE CAMBIARE NOME",
                city: scrapingResult.city,
                phone: scrapingResult.phone,
                years: parseAgeValue(scrapingResult.age),
                groupOwner: groupM.group
            });
        } else {
            const donnaUpdates = {};
            const parsedAge = parseAgeValue(scrapingResult.age);
            if (scrapingResult.city) donnaUpdates.city = scrapingResult.city;
            if (parsedAge) donnaUpdates.years = parsedAge;
            if (Object.keys(donnaUpdates).length > 0) {
                await donna.update(donnaUpdates);
            }
        }

        const phoneDir = `${rootPath}/girls/${donna.phone}`;
        const picsDir = `${phoneDir}/pics`;
        if (!fs.existsSync(phoneDir)) fs.mkdirSync(phoneDir);
        if (!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        let annuncio = await ctx.tblAnnunci.findOne({
            where: { donna: donna.id, title: scrapingResult.title }
        });

        const categorie = normalizeMegaescortCategory(scrapingResult.category);
        const serviceNazionalita =
            normalizeTrovagnoccaNationality(scrapingResult.nationality) ||
            normalizeTrovagnoccaNationality(getMegaescortAttribute(scrapingResult.attributes, ["nazionalit\u00e0", "nazionalita", "nationality"])) ||
            normalizeTrovagnoccaNationality(findTrovagnoccaNationalityCandidate(scrapingResult.attributes));

        const trovagnoccaNote = buildTrovagnoccaContactNote(scrapingResult);

        if (!annuncio) {
            annuncio = await ctx.tblAnnunci.create({
                title: scrapingResult.title,
                city: scrapingResult.city,
                location: scrapingResult.location,
                description: scrapingResult.description,
                donna: donna.id,
                hasWhatapp: scrapingResult.whatsapp,
                categorie,
                sono: categorie,
                serviceNazionalita,
                note: trovagnoccaNote,
                groupOwner: groupM.group,
                editedBy: userid,
                cost: 0
            });
        } else {
            await annuncio.update({
                city: scrapingResult.city,
                location: scrapingResult.location,
                description: scrapingResult.description,
                hasWhatapp: scrapingResult.whatsapp,
                categorie,
                sono: categorie,
                serviceNazionalita,
                note: trovagnoccaNote,
                editedBy: userid
            });
        }

        if (scrapingResult.imageFiles && scrapingResult.imageFiles.length > 0) {
            for (let i = 0; i < scrapingResult.imageFiles.length; i++) {
                const fileName = scrapingResult.imageFiles[i];
                await ctx.tblGalleria.create({
                    donna: donna.id,
                    src: `/images/get?phone=${donna.phone}&index=${i}`,
                    GCRecord: null,
                    origin: basename(fileName),
                    isHidden: false,
                });
            }
        } else {
            console.error("No Trovagnocca images found in scraping result.");
        }

        return res.json({ id: annuncio.id, donna: donna.id });
    } catch (error) {
        console.error("Error in /scrapeTrovagnocca route:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
});

router.post("/trovagnoccaPrice", authenticateKey, async (req, res) => {
    const numberDays = parseInt(req.body.numberDays, 10) || 1;
    const timeSlots = Array.isArray(req.body.timeSlots)
        ? [...new Set(req.body.timeSlots.map((slot) => parseInt(slot, 10)).filter(Number.isFinite))]
        : [];

    if (!timeSlots.length) {
        return res.status(400).json({ error: "At least one time slot is required." });
    }

    const params = new URLSearchParams();
    params.set("number_days", `${numberDays}`);
    timeSlots.forEach((slot) => params.append("timeSlots[]", `${slot}`));

    let lastError = null;

    try {
        const response = await axios.get(
            `https://www.trovagnocca.com/api/v1/custom/product/get-price?${params.toString()}`,
            {
                headers: {
                    accept: "application/json",
                    "accept-language": "en-US,en;q=0.9",
                    authorization: req.body.authorization || "Bearer undefined",
                    referer: `https://www.trovagnocca.com/dmc/account`,
                    ...(req.body.csrfToken ? { "x-csrf-token": req.body.csrfToken } : {})
                },
                timeout: 15000
            }
        );
        console.log(response.data, 'get-price response');
        return res.status(response.status).json(response.data);
    } catch (error) {
        lastError = error;
        console.log({
            csrfToken: req.body.csrfToken, 
            status: error.response?.status,
            details: error.response?.data || error.message
        }, 'get-price error');
    }

    const status = lastError?.response?.status || 500;
    return res.status(status).json({
        error: "Unable to calculate Trovagnocca price.",
        details: lastError?.response?.data || lastError?.message
    });
});

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {  // recurse
                deleteFolderRecursive(curPath);
            } else {                                    // delete file
                fs.unlinkSync(curPath.replace(/\\/g, "/"));
            }
        });
        fs.rmdirSync(path);
    }
};

var downloadFile = function (url, callback, args) {
    var http;
    if (url.indexOf("https") == -1) {
        http = require('http');
    } else {
        http = require('https');
    }

    var Stream = require('stream').Transform;
    http.request(url, function (response) {
        var data = new Stream();

        response.on('data', function (chunk) {
            data.push(chunk);
        });

        response.on('end', function () {
            callback(data.read(), args);
        });
    }).end();
}

router.post("/getByID", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({ where: { OID: userid } });
    let groupM = null;
    if (!req.body.panel) {
        groupM = await user.getGroup();
    }

    // ===== Build dynamic WHERE clause =====
    const whereClause = { id: req.body.id };

    // Only add groupOwner condition if panel is NOT provided
    if (!req.body.panel) {
        whereClause.groupOwner = groupM.group;
    }

    // ===== Query the ad =====
    const annuncio = await ctx.tblAnnunci.findOne({
        where: whereClause
    });

    if (annuncio) {
        const scrapingResult = {
            storagePics: false,
            ...annuncio.get({ plain: true })
        };

        if (!annuncio.categorie) {
            scrapingResult.categorie = "DONNAUOMO";
        } else {
            scrapingResult.categorie = normalizeMegaescortCategory(annuncio.categorie);
        }
        const panel = normalizePanelPlatform(req.body.panel);
        if (panel == "trovagnocca") {
            const contactNote = parseTrovagnoccaContactNote(annuncio.note);
            scrapingResult.hasTelegram = Boolean(contactNote.telegram || contactNote.telegramNumber || contactNote.telegramUrl);
            scrapingResult.telegram = contactNote.telegramNumber || "";
            scrapingResult.telegramUrl = contactNote.telegramUrl || "";
        }
        var donna = await annuncio.getTblDonne();
        if (donna) {
            scrapingResult.name = donna.name;
            scrapingResult.age = donna.years;
            scrapingResult.isPhoneChecked = donna.isPhoneChecked;
            scrapingResult.phone = donna.phone;
            scrapingResult.donnaID = donna.id;
            scrapingResult.images = new Array;
            var galleria = await donna.getTblGalleria({ where: { GCRecord: null } });
            if (galleria.length > 0) {
                scrapingResult.images = galleria.sort((a, b) => getGalleryOrderIndex(a) - getGalleryOrderIndex(b));
            }
        }
        var schedulazioni = await annuncio.getTblSchedulazionis({ where: { GCRecord: null, [Op.or]: [{ state: { [Op.ne]: "CLOSED" } }, { state: null }] } });
        scrapingResult.schedule = {};
        // console.log(schedulazioni, 'schedule of tasks')
        if (schedulazioni.length != 0) {
            var dayTask;
            for (task in schedulazioni) {
                // console.log(schedulazioni[task].data, 'task data in schedulazioni');
                let date = schedulazioni[task].data.toISOString().split('T')[0];
                if (!scrapingResult.schedule[date]) scrapingResult.schedule[date] = [];
                let resultS = {};
                resultS = { ...schedulazioni[task].dataValues };
                resultS.images = [];
                let imgs = await schedulazioni[task].getTblGalleriaAnnuncios({ where: { GCRecord: null } });
                if (imgs.length != 0) {
                    resultS.images = imgs;
                }
                scrapingResult.schedule[date].push(resultS);
            }
        };
        return res.json({
            ...scrapingResult
        });
    } else {
        return res.sendStatus(400);
    };

});

router.post("/getByPhone", authenticateKey, (req, res) => {
    if (!req.body.phone) return res.sendStatus(400);
    fs.readFile(`${GLOBAL_PATH}/girls/${req.body.phone}/info.json`, (err, data) => {
        if (err) return res.sendStatus(400);
        const scrapingResult = JSON.parse(data);
        scrapingResult.storagePics = true;
        scrapingResult.verifiedPhone = true;
        fs.readFile(`${GLOBAL_PATH}/girls/${req.body.phone}/schedule.json`, (err, scheduleData) => {
            if (err) return res.json(scrapingResult);
            return res.json({
                ...scrapingResult,
                schedule: sortSchedule(JSON.parse(scheduleData)),
            });
        });
    });
});

router.post("/getDonne", authenticateKey, (req, res) => {
    var userid = req.session.userid;
    ctx.tblUser.findAll({
        where: {
            OID: userid
        }
    }).then((users) => {
        users[0].getGroup().then(function (gruppo) {
            if (gruppo) {
                ctx.tblDonne.findAll({
                    where: {
                        GCRecord: null,
                        groupOwner: gruppo.id
                    },
                    order: [["name", "DESC"]],
                    include: [{
                        model: ctx.tblAnnunci,
                        order: [["id", "DESC"]]
                    }]
                }).then((result) => {
                    res.json({ donne: result });
                });
            } else {
                res.json({ donne: [] });
            }
        });
    });
});

router.post("/updateInfo", authenticateKey, async (req, res) => {
    const { info } = req.body
    const panel = normalizePanelPlatform(req.body.panel);
    const parsedAge = parseAgeValue(info.age);
    // Checking if the info has been correctly inserted
    if (
        info.city === "Seleziona una città" ||
        !info.title || info.title.length < 5 ||
        !info.description || info.description.length < 20 ||
        !info.phone || isNaN(info.phone)
    ) return res.sendStatus(405);

    if (panel !== 'bakeca') {
        if (!info.age || parsedAge === null || (panel !== 'megaescort' && isNaN(info.age))) {
            return res.sendStatus(405)
        }
    }

    if (panel == "trovagnocca") {
        info.note = buildTrovagnoccaContactNote({ telegram: info.telegram });
        info.hasWhatapp = Boolean(info.whatsapp);
        delete info.whatsapp;
        delete info.telegram;
    }

    if (info.categorie) {
        info.categorie = normalizeMegaescortCategory(info.categorie);
    }
    if (info.sono && panel !== "bakeca") {
        info.sono = normalizeMegaescortCategory(info.sono);
    }

    var userid = req.session.userid;
    var user = await ctx.tblUser.findOne({ where: { OID: userid } });
    var groupM = await user.getGroup();
    var annuncio;
    var donna;
    if (req.body.id) {
        annuncio = await ctx.tblAnnunci.findOne({ where: { id: req.body.id } });
    }
    if (annuncio) {
        donna = await annuncio.getTblDonne();
    } else {
        donna = await ctx.tblDonne.findOne({ where: { phone: req.body.info.phone } });
    }

    // Creating the girl folder if it does not exist and setting up the verifiedCities.json file
    var oldPhone = null;
    var donnaInfo = {
        name: info.name,
        city: info.city,
        phone: info.phone,
    }

    if (panel !== 'bakeca') {
        donnaInfo.years = parsedAge
    }
    if (!donna) {
        donnaInfo.isPhoneChecked = true;
        donnaInfo.groupOwner = groupM.group;
        donna = await ctx.tblDonne.create({
            ...donnaInfo
        });

        oldPhone = donna.phone;
    } else {
        oldPhone = donna.phone;
        if (panel !== 'bakeca') {
            donnaInfo.years = parsedAge
            donnaInfo.GCRecord = null
        }

        await donna.update({ ...donnaInfo });
        donna.phone = req.body.info.phone;
    }

    if (!fs.existsSync(`${rootPath}/girls/${donna.phone}`)) fs.mkdirSync(`${rootPath}/girls/${donna.phone}`);
    if (!fs.existsSync(`${rootPath}/girls/${donna.phone}/pics`)) fs.mkdirSync(`${rootPath}/girls/${donna.phone}/pics`);

    // Writing the girl's info
    if (!req.body.id) {
        var annuncio = await ctx.tblAnnunci.create({
            donna: donna.id,
            cost: 0,
            groupOwner: groupM.group,
            editedBy: userid,

            ...info
        });
        res.json(annuncio);
    } else {
        var annuncio = await ctx.tblAnnunci.findOne({ where: { id: req.body.id } });
        if (annuncio.phoneTmp != null || oldPhone != req.body.info.phone) {
            if (oldPhone != req.body.info.phone) {
                annuncio.phoneTmp = oldPhone;
            }
            if (fs.existsSync(`${rootPath}/girls/${annuncio.phoneTmp}`)) {
                var gallery = await ctx.tblGalleria.findAll({ where: { GCRecord: null, src: { [Op.like]: `%phone=${annuncio.phoneTmp}%` } } });
                for (g of gallery) {
                    const moveResult = moveGalleryFileToPhone(annuncio.phoneTmp, donna.phone, g.origin);
                    if (!moveResult.destinationExists) {
                        console.warn(`Gallery file missing during phone migration: ${annuncio.phoneTmp}/${g.origin}`);
                        continue;
                    }
                    await g.update({ donna: donna.id, src: getGalleryPhoneImageSrc(donna.phone, g.origin) });
                }
            }
        }
        await annuncio.update({
            editedBy: userid,
            donna: donna.id,
            phoneTmp: null,
            ...info
        });
        res.json(annuncio);
    }
});

router.post("/updateSchedule", authenticateKey, async (req, res) => {
    if (!req.body.id || !req.body.schedule) return res.sendStatus(400);

    var userid = req.session.userid;
    var girl = await ctx.tblAnnunci.findOne({ where: { id: req.body.id } });
    if (!girl)
        return res.sendStatus(405);
    var allSchedulazioni = req.body.schedule;
    var onlySchedulazioni = [];
    for (let date of Object.keys(allSchedulazioni)) {
        for (s of allSchedulazioni[date]) {
            if (s.id == "") {
                if (!s.GCRecord) s.GCRecord = false;
                if (s.GCRecord == false) {
                    let payed = null;
                    let platform = normalizePanelPlatform(req.body.panel);

                    console.log(s.typeAnnuncio, 'typeAnnuncio');
                    if (s.typeAnnuncio == "Free") payed = true;
                    const period = platform === "megaescort" && s.typeAnnuncio == "Free" ? "" : s.period;
                    var schedulato = await ctx.tblSchedulazioni.create({
                        annuncio: req.body.id,
                        data: s.data,
                        period,
                        typeAnnuncio: s.typeAnnuncio,
                        typePeriodic: "Top",
                        editedBy: userid,
                        hasPremium: s.hasPremium,
                        hasVideo: s.hasVideo,
                        hasHighlight: s.hasHighlight,
                        hasEtichetta: s.hasEtichetta,
                        payed: payed,
                        city: s.city,
                        platform
                    });
                    s.id = schedulato.id;
                    if (s.images) {
                        const imageLimit = platform === "trovagnocca" ? 6 : 5;
                        if (s.images.length == 0) {
                            let anteprima = true;
                            var donna = await girl.getTblDonne()
                            var photos = await donna.getTblGalleria({ limit: imageLimit, where: { isHidden: 0, GCRecord: null } });
                            if (photos) {
                                if (photos.length > 0) {
                                    for (img of photos) {
                                        await ctx.tblGalleriaAnnuncio.create({
                                            schedulazione: schedulato.id,
                                            galleria: img.id,
                                            isAnteprima: anteprima
                                        });
                                        anteprima = false;
                                    }
                                }
                            }
                        } else {
                            for (let img in s.images) {
                                const anteprima = s.images[img].isAnteprima === true || (img == '0' && !s.images.some((image) => image.isAnteprima === true));
                                await ctx.tblGalleriaAnnuncio.create({
                                    schedulazione: schedulato.id,
                                    galleria: s.images[img].galleria,
                                    isAnteprima: anteprima
                                });
                            }
                        }
                    }
                }
            } else {
                let payed = null;
                if (s.typeAnnuncio == "Free") payed = true;
                var task = await ctx.tblSchedulazioni.findOne({ where: { id: s.id } });
                if (task.payed) payed = task.payed;
                var deleteThis = null;
                if (s.GCRecord == true) deleteThis = ctx.newGCRecord();
                console.log(deleteThis, 'deleteThis');

                var state = task.state;
                console.log(state, "state Schedule");

                if (s.state == "EDIT") {
                    if (task.remotePostID != null) state = "EDIT"; //remotePostId 
                    var rImgs = await task.getTblGalleriaAnnuncios({ where: { schedulazione: s.id } });
                    for (r of Object.keys(rImgs)) rImgs[r].update({ GCRecord: ctx.newGCRecord() });
                    var i = 0;
                    const platform = normalizePanelPlatform(req.body.panel);
                    const imageLimit = platform === "trovagnocca" ? 6 : 5;
                    let scheduleImages = Array.isArray(s.images) ? s.images : [];
                    if (scheduleImages.length == 0) {
                        var donna = await girl.getTblDonne();
                        var photos = await donna.getTblGalleria({ limit: imageLimit, where: { isHidden: 0, GCRecord: null } });
                        scheduleImages = photos.map((photo) => ({ galleria: photo.id }));
                    }

                    for (img of scheduleImages) {
                        const hasExplicitAnteprima = scheduleImages.some((image) => image.isAnteprima === true);
                        var anteprima = img.isAnteprima === true || (!hasExplicitAnteprima && i == 0);
                        i++;
                        await ctx.tblGalleriaAnnuncio.create({
                            schedulazione: task.id,
                            galleria: img.galleria,
                            isAnteprima: anteprima
                        });
                    }
                }

                if (s.state == "EDIT" || s.GCRecord) {
                    const period = normalizePanelPlatform(req.body.panel) === "megaescort" && s.typeAnnuncio == "Free" ? "" : s.period;
                    await task.update({
                        data: s.data,
                        period,
                        GCRecord: deleteThis,
                        editedBy: userid,
                        hasPremium: s.hasPremium,
                        hasVideo: s.hasVideo,
                        hasHighlight: s.hasHighlight,
                        hasEtichetta: s.hasEtichetta,
                        payed: payed,
                        state: state,
                        city: s.city
                    });
                }
            }
            onlySchedulazioni.push(s);
        }
    }

    await girl.update({
        cost: await updateCreditAnnuncio(girl)
    });

    res.json({ schedulato: onlySchedulazioni });

});

async function updateCreditAnnuncio(annuncio) {
    //Aggiorno il credito residuo del cliente
    var lastDay = "";
    var credit = 0;
    var tipiAnnuncio = {};
    var allTimeAdsNotPay = await annuncio.getTblSchedulazionis({ where: { GCRecord: null, payed: null } });
    tipiAnnuncio.Free = allTimeAdsNotPay.filter(x => { if (x.typeAnnuncio == "Free") return x; });
    tipiAnnuncio.oneXone = allTimeAdsNotPay.filter(x => { if (x.typeAnnuncio == "1x1") return x; });
    tipiAnnuncio.oneXthree = allTimeAdsNotPay.filter(x => { if (x.typeAnnuncio == "1x3") return x; });
    tipiAnnuncio.oneXseven = allTimeAdsNotPay.filter(x => { if (x.typeAnnuncio == "1x7") return x; });
    tipiAnnuncio.tenXone = allTimeAdsNotPay.filter(x => { if (x.typeAnnuncio == "10x1") return x; });
    tipiAnnuncio.tenXthree = allTimeAdsNotPay.filter(x => { if (x.typeAnnuncio == "10x3") return x; });

    var listino = await ctx.tblListinoPrezzi.findAll({ where: { group: annuncio.groupOwner } });
    //console.log({listino, groupOwner: annuncio.groupOwner})
    var listinoPremium = await ctx.tblListinoPrezziSuper.findAll({ where: { group: annuncio.groupOwner } });

    for (key of Object.keys(tipiAnnuncio)) {
        if (tipiAnnuncio[key].length > 0) {
            var xDay = {};
            for (var i = 0; i < tipiAnnuncio[key].length; i++) {
                if (xDay[tipiAnnuncio[key][i].dataString] == undefined) {
                    xDay[tipiAnnuncio[key][i].dataString] = new Array;
                }
                xDay[tipiAnnuncio[key][i].dataString].push(tipiAnnuncio[key][0]);
            }
            for (day of Object.keys(xDay)) {
                credit += getCreditListino(listino, xDay[day].length, xDay[day][0].typeAnnuncio);
            }


            credit += getCreditPremium(listinoPremium, tipiAnnuncio[key].filter(x => { if (x.hasPremium == true) return x; }).length, tipiAnnuncio[key][0].typeAnnuncio)
        }

    }
    return credit;
}

function getCreditPremium(listino, qta, typeAnnuncio) {
    var totale = 0;
    if (listino) {
        switch (typeAnnuncio) {
            case "1x1":
                totale = listino[0].oneXone * qta;
                break;
            case "1x3":
                totale = listino[0].oneXthree * qta;
                break;
            case "1x7":
                totale = listino[0].oneXseven * qta;
                break;
            case "10x1":
                totale = listino[0].tenXone * qta;
                break;
            case "10x3":
                totale = listino[0].tenXthree * qta;
                break;
        }
    }
    return totale;
}

function getCreditListino(listino, qta, typeAnnuncio) {
    var totale = 0;
    if (listino) {
        // Filter the listino array to find the matching uscita
        var rowListino = listino.filter(x => x.uscita == qta);

        // If no matching uscita found, use the default uscita of 1
        if (!rowListino[0]) {
            var restore = listino.filter(x => x.uscita == 1);
            if (!restore || !restore[0]) {  // Check if restore array exists and has at least one element
                totale = 0;
            } else {
                var partial = 0;
                switch (typeAnnuncio) {
                    case "1x1":
                        partial = restore[0].oneXone || 0;  // Safely access properties or default to 0
                        break;
                    case "1x3":
                        partial = restore[0].oneXthree || 0;
                        break;
                    case "1x7":
                        partial = restore[0].oneXseven || 0;
                        break;
                    case "10x1":
                        partial = restore[0].tenXone || 0;
                        break;
                    case "10x3":
                        partial = restore[0].tenXthree || 0;
                        break;
                }
                totale = getCreditListino(listino, qta - 1, typeAnnuncio) + partial;
            }
        } else {
            // If rowListino exists, access properties safely
            switch (typeAnnuncio) {
                case "1x1":
                    totale = rowListino[0].oneXone || 0;
                    break;
                case "1x3":
                    totale = rowListino[0].oneXthree || 0;
                    break;
                case "1x7":
                    totale = rowListino[0].oneXseven || 0;
                    break;
                case "10x1":
                    totale = rowListino[0].tenXone || 0;
                    break;
                case "10x3":
                    totale = rowListino[0].tenXthree || 0;
                    break;
            }
        }
    }
    return totale;
}


router.post("/advertisements", authenticateKey, async (req, res) => {
    if (!req.body.day) return res.sendStatus(400);
    const dateSel = new Date(req.body.day);
    var dateAfter = new Date(req.body.day);
    dateAfter.setDate(dateSel.getDate() + 1);
    var userID = req.session.userid;
    var utente = await ctx.tblUser.findOne({ where: { OID: userID } });
    var membroGruppo = await utente.getGroup();

    var schedulazioni = await ctx.tblSchedulazioni.findAll({
        where: {
            [Op.and]: [
                { data: { [Op.gt]: dateSel } },
                { data: { [Op.lt]: dateAfter } }
            ],
            GCRecord: null
        },
        order: [['state', 'ASC'], ['data', 'ASC']],
        include: [{
            model: ctx.tblAnnunci,
            required: true,
            where: { GCRecord: null, groupOwner: membroGruppo.group },
            include: [{
                model: ctx.tblDonne,
                required: true
            }]
        }]
    });

    for (x of schedulazioni) {
        let t = x.data;
        x.time = t.toISOString().split("T")[1].split(":00.")[0];
        let anteprima = await x.getTblGalleriaAnnuncios({
            where: { GCRecord: null, isAnteprima: true }, include: [{
                model: ctx.tblGalleria,
                required: true
            }]
        });

        if (anteprima.length > 0) {
            let anteprimaGalleria = await anteprima[0].getTblGallerium();
            x.Anteprima = anteprimaGalleria.src + "&id=" + anteprima[0].tblGallerium.id;
        }

    }

    res.json(schedulazioni);
});

router.post("/storico", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);

    let platform = normalizePanelPlatform(req.body.panel);
    console.log(platform, 'platform')

    var schedulazioni = null;
    if (req.body.sus) {
        schedulazioni = await ctx.tblSchedulazioni.findAll({ where: { annuncio: req.body.id, platform, GCRecord: null, [Op.or]: [{ state: "CLOSED" }, { state: "CLOSE" }, { state: "DELETE" }] }, order: [['data', 'DESC']] });
    } else {
        schedulazioni = await ctx.tblSchedulazioni.findAll({ where: { annuncio: req.body.id, platform, GCRecord: null, [Op.or]: [{ [Op.and]: [{ state: { [Op.ne]: "CLOSED" } }, { state: { [Op.ne]: "CLOSE" } }, { state: { [Op.ne]: "DELETE" } }] }, { state: null }] }, order: [['data', 'DESC']] });
    }

    var response = [];
    for (s of schedulazioni) {
        let data = { ...s.dataValues };
        data.user = await s.getTblUser();
        if (data.user) data.user = data.user.userName;
        response.push(data);
    }
    res.json({ storico: response });

});

router.post("/deleteStorico", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);

    var schedulazioni = await ctx.tblSchedulazioni.update({ GCRecord: ctx.newGCRecord() },
        { where: { id: req.body.id } });

    if (schedulazioni.length != 0) {
        var annuncio = await ctx.tblAnnunci.findOne({ where: { id: req.body.annuncio } });
        await annuncio.update({
            cost: await updateCreditAnnuncio(annuncio)
        });
    }
    res.sendStatus(200);
});

router.get("/blacklist", authenticateKey, async (req, res) => {

    var blacklist = await ctx.tblBlackList.findAll({ where: { GCRecord: null } });

    res.json(blacklist);

});

router.post("/updateAllDataSchedule", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    const userid = req.session.userid;
    const panel = normalizePanelPlatform(req.body.panel);
    var annuncio = await ctx.tblAnnunci.findOne({ where: { id: req.body.id } });
    if (annuncio) {
        var nextCategory = normalizeMegaescortCategory(req.body.info.categorie || annuncio.categorie);
        var previousCategory = normalizeMegaescortCategory(annuncio.categorie);
        var shouldRepublishBakeca = panel == "bakeca" && nextCategory != previousCategory;
        const nextNote = panel == "trovagnocca"
            ? buildTrovagnoccaContactNote({ telegram: req.body.info.telegram })
            : (req.body.info.note || annuncio.note);

        await annuncio.update({
            title: req.body.info.title,
            city: req.body.info.city,
            location: req.body.info.location,
            description: req.body.info.description,
            categorie: nextCategory,
            hasWhatapp: req.body.info.whatsapp,
            serviceNazionalita: req.body.info.serviceNazionalita,
            note: nextNote,
            editedBy: userid
        });

        var donna = await annuncio.getTblDonne();
        var currPath = `${rootPath}/girls/${donna.phone}`;
        var newPath = `${rootPath}/girls/${req.body.info.phone}`
        if (newPath != currPath) {
            if (fs.existsSync(currPath) && !fs.existsSync(newPath)) {
                fs.renameSync(currPath, newPath);
            } else if (!fs.existsSync(currPath) && !fs.existsSync(newPath)) {
                fs.mkdirSync(`${newPath}/pics`, { recursive: true });
            }
        }
        var donnaExist = await ctx.tblDonne.findOne({ where: { phone: req.body.info.phone } });
        if (donnaExist) {
            await annuncio.update({ donna: donnaExist.id });
            await donnaExist.update({ name: req.body.info.name, GCRecord: null });
        } else {
            await donna.update({ phone: req.body.info.phone, name: req.body.info.name, GCRecord: null });
        }

        var sevenDay = new Date();
        sevenDay.setDate(sevenDay.getDate() - 7);
        let schedulazioniWhere = { annuncio: req.body.id, GCRecord: null, state: "OK", remotePostID: { [Op.ne]: null }, data: { [Op.gt]: sevenDay } };
        if (panel == "bakeca") {
            schedulazioniWhere = {
                annuncio: req.body.id,
                platform: "bakeca",
                GCRecord: null,
                state: "OK",
                data: { [Op.gt]: sevenDay },
                [Op.or]: [
                    { remotePostID: { [Op.ne]: null } },
                    // { urlBK: { [Op.ne]: null } }
                ]
            };
        }
        var schedulazioni = await ctx.tblSchedulazioni.findAll({ where: schedulazioniWhere });

        var newGallery = await donna.getTblGalleria({ limit: 5, where: { isHidden: 0, GCRecord: null } });

        var recentPublishLimit = new Date();
        recentPublishLimit.setDate(recentPublishLimit.getDate() - 8);
        for (ad of schedulazioni) {
            if (ad.data > recentPublishLimit) {
                if (shouldRepublishBakeca) {
                    var republishSchedule = await ctx.tblSchedulazioni.create({
                        annuncio: ad.annuncio,
                        data: new Date(),
                        period: ad.period,
                        typeAnnuncio: ad.typeAnnuncio,
                        editedBy: userid,
                        hasPremium: ad.hasPremium,
                        hasVideo: ad.hasVideo,
                        hasHighlight: ad.hasHighlight,
                        hasEtichetta: ad.hasEtichetta,
                        payed: ad.payed,
                        city: req.body.info.city || ad.city,
                        platform: ad.platform
                    });

                    var republishAnteprima = true;
                    for (newG of newGallery) {
                        await ctx.tblGalleriaAnnuncio.create({ galleria: newG.id, schedulazione: republishSchedule.id, isAnteprima: republishAnteprima });
                        republishAnteprima = false;
                    }

                    await ad.update({ state: "DELETE", editedBy: userid });
                    continue;
                }

                var galleryes = await ad.getTblGalleriaAnnuncios({ where: { GCRecord: null } });
                for (oldG of galleryes) await oldG.update({ GCRecord: ctx.newGCRecord() });
                var antePrima = true;
                for (newG of newGallery) {
                    await ctx.tblGalleriaAnnuncio.create({ galleria: newG.id, schedulazione: ad.id, isAnteprima: antePrima });
                    antePrima = false;
                }

                await ad.update({ state: "EDIT" });
            }
        }

    }
    res.sendStatus(201);
});

router.post("/suspend", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    await ctx.tblSchedulazioni.update({ state: "CLOSE" }, { where: { id: req.body.id } });
    res.sendStatus(200);
});

router.post("/republishSchedule", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    await ctx.tblSchedulazioni.update({ state: "REPUBLISH", editedBy: req.session.userid }, { where: { id: req.body.id } });
    res.sendStatus(200);
});

router.post("/deleteSchedule", authenticateKey, async (req, res) => {
    if (!req.body.id) return res.sendStatus(400);
    await ctx.tblSchedulazioni.update({ state: "DELETE" }, { where: { id: req.body.id } });
    res.sendStatus(200);
});

router.post("/suspendAllPublished", authenticateKey, async (req, res) => {
    if (!req.body.annuncio) return res.sendStatus(400);

    let platform = normalizePanelPlatform(req.body.panel);

    await ctx.tblSchedulazioni.update({
        state: "CLOSE"
    }, {
        where: {
            annuncio: req.body.annuncio,
            platform,
            GCRecord: null,
            state: "OK"
        }
    });

    res.sendStatus(200);
});

router.post("/deleteAllPublished", authenticateKey, async (req, res) => {
    if (!req.body.annuncio) return res.sendStatus(400);

    let platform = normalizePanelPlatform(req.body.panel);

    await ctx.tblSchedulazioni.update({
        state: "DELETE"
    }, {
        where: {
            annuncio: req.body.annuncio,
            platform,
            GCRecord: null,
            state: "OK"
        }
    });

    res.sendStatus(200);
});

router.post("/suspendAll", authenticateKey, async (req, res) => {
    if (!req.body.annuncio) return res.sendStatus(400);
    let platform = normalizePanelPlatform(req.body.panel);

    var schedulazioni = await ctx.tblSchedulazioni.findAll({ where: { annuncio: req.body.annuncio, platform, GCRecord: null, [Op.or]: [{ [Op.and]: [{ state: { [Op.ne]: "CLOSED" } }, { state: { [Op.ne]: "CLOSE" } }, { state: { [Op.ne]: "DELETE" } }] }, { state: null }] } });

    if (platform == "bakecaincontrii") {
        var outS = new Array;

        for (s of schedulazioni) {
            var dead = new Date(s.data);
            var period = new Date(s.data);

            if (s.typeAnnuncio != "Free" && s.typeAnnuncio != "10x1" && s.typeAnnuncio != "10x3") {
                var hPeriod = parseInt(s.period.substr(0, 2));
                period.setHours(hPeriod);
                period.setMinutes(period.getMinutes() + (period.getTimezoneOffset() * -1));
            }

            switch (s.typeAnnuncio) {
                case "Free":
                    dead.setDate(dead.getDate() + 1);
                    break;
                case "1x1":
                    if (s.data < period) {
                        dead.setDate(dead.getDate() + 1);
                    } else {
                        dead.setDate(dead.getDate() + 2);
                    }
                    break;
                case "1x3":
                    if (s.data < period) {
                        dead.setDate(dead.getDate() + 3);
                    } else {
                        dead.setDate(dead.getDate() + 4);
                    }
                    break;
                case "1x7":
                    if (s.data < period) {
                        dead.setDate(dead.getDate() + 7);
                    } else {
                        dead.setDate(dead.getDate() + 8);
                    }
                    break;
                case "10x1":
                    dead.setDate(dead.getDate() + 1);
                    break;
                case "10x3":
                    dead.setDate(dead.getDate() + 4);
                    break;
            }
            s.dead = dead;
            outS.push(s);
        }

        var schedulazioniFiltrate = outS.filter(x => { if (x.dead < new Date()) return x; });

        for (x of schedulazioniFiltrate) {
            x.update({ state: "CLOSE" });
        }

        res.sendStatus(200);
    } else {
        for (s of schedulazioni) {
            s.update({ state: "CLOSE" });
        }

        res.sendStatus(200)
    }
});

// router.post("/updateDataSchedule", authenticateKey, async (req, res) => {
//     if (!req.body.id) return res.sendStatus(400);
//     const userid = req.session.userid;
//     var annuncio = await ctx.tblAnnunci.findOne({where:{id: req.body.id}});
//     if (annuncio){

//         var schedulazione = await ctx.tblSchedulazioni.findOne({where:{id: req.body.sID, remotePostID: {[Op.ne]: null}}});

//         if (schedulazione){
//             await schedulazione.update({state: "EDIT"});
//         }else{
//             return res.sendStatus(200);
//         }
//     }
//     res.sendStatus(201);
// });

module.exports = router;
