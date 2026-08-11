const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const MOSCAROSSA_HOSTS = new Set(["moscarossa.biz", "www.moscarossa.biz"]);

puppeteer.use(StealthPlugin());

function cleanText(value) {
    return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function normalizePhone(value) {
    let phone = cleanText(value).replace(/^tel:\/\//i, "").replace(/^tel:/i, "").replace(/\D/g, "");
    if (phone.startsWith("0039")) phone = phone.slice(4);
    if (phone.length === 12 && phone.startsWith("393")) phone = phone.slice(2);
    return phone;
}

function extractRemotePostID(...values) {
    for (const value of values) {
        const text = `${value || ""}`;
        const matches = [...text.matchAll(/\d{3,}/g)];
        if (matches.length) return matches[matches.length - 1][0];
    }
    return "";
}

function parseMoscarossaAdUrl(value) {
    let parsed;
    try {
        parsed = new URL(`${value || ""}`.trim());
    } catch {
        throw new Error("Inserisci un URL Moscarossa valido.");
    }

    const hostname = parsed.hostname.toLowerCase();
    const validPort = !parsed.port || parsed.port === "80" || parsed.port === "443";
    if (!["http:", "https:"].includes(parsed.protocol) || !MOSCAROSSA_HOSTS.has(hostname) || !validPort || parsed.username || parsed.password) {
        throw new Error("Sono accettati soltanto URL pubblici ospitati su https://www.moscarossa.biz/.");
    }

    return {
        remotePostID: extractRemotePostID(parsed.pathname, parsed.search),
        url: parsed.href
    };
}

function normalizeCategory(value) {
    const category = cleanText(value).toLowerCase();
    if (category.includes("trans")) return "TRANS";
    if (category.includes("massagg")) return "MASSAGGI";
    if (category.includes("uom") || category.includes("gigol")) return "UOMODONNA";
    return "DONNAUOMO";
}

async function downloadMoscarossaImages(browser, images, phone, remotePostID) {
    const appRoot = process.env.PROD == 0
        ? path.dirname((require.main && require.main.filename) || __filename)
        : (process.env.APP_PATH_PRODUCTION || path.dirname((require.main && require.main.filename) || __filename));
    const picturesDirectory = path.join(appRoot, "girls", phone, "pics");
    fs.mkdirSync(picturesDirectory, { recursive: true });
    const savedFiles = [];

    for (let index = 0; index < images.length; index += 1) {
        const imagePage = await browser.newPage();
        try {
            await imagePage.setUserAgent(USER_AGENT);
            const response = await imagePage.goto(images[index], { waitUntil: "networkidle2", timeout: 30000 });
            const contentType = response?.headers()?.["content-type"] || "";
            if (!response || response.status() !== 200 || !contentType.startsWith("image/")) {
                throw new Error(`HTTP ${response?.status() || "sconosciuto"}, content-type ${contentType || "mancante"}`);
            }
            const extension = contentType.includes("png") ? "png"
                : contentType.includes("webp") ? "webp"
                    : contentType.includes("gif") ? "gif"
                        : "jpg";
            const fileName = `moscarossa-${remotePostID}-${index}.${extension}`;
            fs.writeFileSync(path.join(picturesDirectory, fileName), await response.buffer());
            savedFiles.push(fileName);
        } catch (error) {
            console.warn(`Moscarossa image ${index + 1} could not be downloaded:`, error.message);
        } finally {
            await imagePage.close().catch(() => null);
        }
    }

    return savedFiles;
}

async function scrape(value) {
    const requested = parseMoscarossaAdUrl(value);
    const executablePath = typeof puppeteer.executablePath === "function"
        ? await puppeteer.executablePath()
        : undefined;
    const browser = await puppeteer.launch({
        headless: "new",
        executablePath,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--window-size=1366,900"
        ],
        defaultViewport: { width: 1366, height: 900 }
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent(USER_AGENT);
        await page.setExtraHTTPHeaders({
            "accept-language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7"
        });

        const response = await page.goto(requested.url, { waitUntil: "domcontentloaded", timeout: 45000 });
        if (!response || response.status() >= 400) {
            throw new Error(`Moscarossa ha risposto con HTTP ${response?.status() || "sconosciuto"}.`);
        }
        const finalUrl = parseMoscarossaAdUrl(page.url());
        await page.waitForSelector("#p_titolo, .escort-dett-container", { timeout: 15000 });

        const data = await page.evaluate(() => {
            const clean = (text) => `${text || ""}`.replace(/\s+/g, " ").trim();
            const absoluteUrl = (url) => {
                try {
                    return url ? new URL(url, window.location.href).href : "";
                } catch {
                    return "";
                }
            };
            const valueAfterLabel = (label) => {
                const target = clean(label).toLowerCase();
                const rows = Array.from(document.querySelectorAll(".dett-col-int.dett-row, .dett-row"));
                for (const row of rows) {
                    const labels = Array.from(row.querySelectorAll(".p"));
                    if (!labels.some((node) => clean(node.textContent).toLowerCase().startsWith(target))) continue;
                    const value = Array.from(row.querySelectorAll(".button"))
                        .map((node) => clean(node.textContent))
                        .find(Boolean);
                    if (value) return value;
                }
                return "";
            };
            const extractRemoteId = (...values) => {
                for (const value of values) {
                    const matches = [...`${value || ""}`.matchAll(/\d{3,}/g)];
                    if (matches.length) return matches[matches.length - 1][0];
                }
                return "";
            };
            const pathnameOf = (url) => {
                try {
                    return new URL(url, window.location.href).pathname;
                } catch {
                    return "";
                }
            };

            const canonicalUrl = absoluteUrl(document.querySelector("link[rel='canonical']")?.getAttribute("href"));
            const openGraphUrl = absoluteUrl(document.querySelector("meta[property='og:url']")?.getAttribute("content"));
            const idElement = document.querySelector("[data-id-escort], [data-idannuncio], [data-id-annuncio], [data-id]");
            const dataId = idElement?.getAttribute("data-id-escort")
                || idElement?.getAttribute("data-idannuncio")
                || idElement?.getAttribute("data-id-annuncio")
                || idElement?.getAttribute("data-id")
                || "";
            const rawImages = Array.from(document.querySelectorAll("#div_info .foto_escort img[src-big], #div_info .foto_escort img[data-src]"))
                .map((image) => absoluteUrl(image.getAttribute("src-big") || image.getAttribute("data-src") || image.getAttribute("src")))
                .filter((url) => {
                    try {
                        const parsed = new URL(url);
                        return parsed.hostname === "fotom.b-cdn.net" && !/anteprima\.jpg/i.test(parsed.pathname);
                    } catch {
                        return false;
                    }
                });
            const remotePostID = extractRemoteId(
                window.location.pathname,
                pathnameOf(canonicalUrl),
                pathnameOf(openGraphUrl),
                dataId,
                ...rawImages.map(pathnameOf)
            );
            const currentFolder = remotePostID ? `/${remotePostID}/` : "";
            const matchingImages = currentFolder
                ? rawImages.filter((url) => {
                    try {
                        return new URL(url).pathname.includes(currentFolder);
                    } catch {
                        return false;
                    }
                })
                : [];
            const images = matchingImages.length ? matchingImages : rawImages;
            const telLink = document.querySelector(".escort-dett-container a[href^='tel:']");
            const whatsappLinks = Array.from(document.querySelectorAll(".escort-dett-container a[href*='wa.me']"))
                .map((link) => absoluteUrl(link.getAttribute("href")))
                .filter(Boolean);
            const gender = clean(document.querySelector(".gender-1")?.textContent) ||
                clean(document.querySelector("#breadcrumbs span[itemprop='name']:nth-last-of-type(2)")?.textContent);

            return {
                title: clean(document.querySelector("#p_titolo")?.innerText),
                description: clean(document.querySelector("#p_testo")?.innerText),
                name: clean(document.querySelector(".escort-dett-inside-in h2")?.innerText),
                age: valueAfterLabel("Età").match(/\d{1,2}/)?.[0] || "",
                city: valueAfterLabel("Città"),
                phone: telLink?.getAttribute("href") || "",
                whatsapp: whatsappLinks.length > 0,
                whatsappLinks,
                category: gender,
                airConditioned: Boolean(document.querySelector("[title*='climatizzato' i]")),
                images: [...new Set(images)].slice(0, 20),
                remotePostID,
                url: window.location.href
            };
        });

        const phone = normalizePhone(data.phone);
        if (!phone) throw new Error("L'annuncio Moscarossa non contiene un numero di telefono leggibile.");
        if (!data.title || !data.description) {
            throw new Error("Titolo o descrizione non trovati nella pagina Moscarossa.");
        }

        const remotePostID = data.remotePostID || finalUrl.remotePostID || requested.remotePostID;
        if (!remotePostID) {
            throw new Error("Identificativo remoto non trovato nella pagina pubblica Moscarossa.");
        }

        const imageFiles = await downloadMoscarossaImages(browser, data.images, phone, remotePostID);
        return {
            ...data,
            ...requested,
            remotePostID,
            url: data.url || finalUrl.url,
            phone,
            category: normalizeCategory(data.category),
            location: data.city,
            imageFiles
        };
    } finally {
        await browser.close();
    }
}

module.exports = {
    normalizePhone,
    parseMoscarossaAdUrl,
    scrape
};
