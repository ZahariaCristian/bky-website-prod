const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const MOSCAROSSA_DETAILS_CONFIG = require("../../public/js/panels/moscarossa/details-config");

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

function buildMoscarossaImageVariants(value) {
    try {
        const parsed = new URL(value);
        const variants = [parsed.href];
        for (const imageClass of ["hig", "mid", "low"]) {
            const candidate = new URL(parsed.href);
            candidate.searchParams.set("class", imageClass);
            variants.push(candidate.href);
        }
        const originalSize = new URL(parsed.href);
        originalSize.searchParams.delete("class");
        variants.push(originalSize.href);
        return [...new Set(variants)];
    } catch {
        return [];
    }
}

async function downloadMoscarossaImages(images, phone, remotePostID, sourceUrl) {
    const appRoot = process.env.PROD == 0
        ? path.dirname((require.main && require.main.filename) || __filename)
        : (process.env.APP_PATH_PRODUCTION || path.dirname((require.main && require.main.filename) || __filename));
    const picturesDirectory = path.join(appRoot, "girls", phone, "pics");
    fs.mkdirSync(picturesDirectory, { recursive: true });
    const savedFiles = [];
    const usedImageIndexes = new Set(
        fs.readdirSync(picturesDirectory)
            .map((fileName) => fileName.match(/^(\d+)\.[^.]+$/)?.[1])
            .filter((index) => index !== undefined)
            .map(Number)
    );
    let nextImageIndex = 0;

    const allocateImageIndex = () => {
        while (usedImageIndexes.has(nextImageIndex)) nextImageIndex += 1;
        const allocatedIndex = nextImageIndex;
        usedImageIndexes.add(allocatedIndex);
        nextImageIndex += 1;
        return allocatedIndex;
    };

    for (let index = 0; index < images.length; index += 1) {
        try {
            let downloaded = null;
            const failures = [];
            for (const candidateUrl of buildMoscarossaImageVariants(images[index])) {
                let parsedCandidate;
                try {
                    parsedCandidate = new URL(candidateUrl);
                } catch {
                    failures.push("URL immagine non valido");
                    continue;
                }
                if (parsedCandidate.protocol !== "https:" || parsedCandidate.hostname !== "fotom.b-cdn.net") {
                    failures.push(`Host immagine non consentito: ${parsedCandidate.hostname || "sconosciuto"}`);
                    continue;
                }

                const response = await axios.get(parsedCandidate.href, {
                    responseType: "arraybuffer",
                    timeout: 30000,
                    // Do not follow redirects: every image request must remain on the
                    // explicitly allowed Bunny CDN host checked above.
                    maxRedirects: 0,
                    validateStatus: () => true,
                    headers: {
                        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                        "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
                        Referer: sourceUrl,
                        "User-Agent": USER_AGENT
                    }
                }).catch((error) => {
                    failures.push(error.message);
                    return null;
                });
                const contentType = `${response?.headers?.["content-type"] || ""}`.toLowerCase();
                if (response?.status === 200 && contentType.startsWith("image/") && response.data?.byteLength > 0) {
                    downloaded = { data: Buffer.from(response.data), contentType };
                    break;
                }
                failures.push(`HTTP ${response?.status || "sconosciuto"}, content-type ${contentType || "mancante"}`);
            }

            if (!downloaded) {
                throw new Error([...new Set(failures)].join("; "));
            }

            const extension = downloaded.contentType.includes("png") ? "png"
                : downloaded.contentType.includes("webp") ? "webp"
                    : downloaded.contentType.includes("gif") ? "gif"
                        : "jpg";
            // Gallery images use the same numeric filename contract as the
            // other panels. Allocate an unused index so an import cannot
            // overwrite images that already belong to this phone gallery.
            const fileName = `${allocateImageIndex()}.${extension}`;
            fs.writeFileSync(path.join(picturesDirectory, fileName), downloaded.data);
            savedFiles.push(fileName);
        } catch (error) {
            console.warn(`Moscarossa image ${index + 1} could not be downloaded:`, error.message);
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

        // Some Moscarossa pages populate the tariffs/services tab only after it
        // has been activated. Trigger the same tab action as a user and allow
        // either server-rendered or asynchronously inserted content to settle.
        await page.evaluate(() => {
            const tariffTab = document.querySelector(".btn_div_tariffe, [onclick*='div_tariffe']");
            if (tariffTab instanceof HTMLElement) tariffTab.click();
        }).catch(() => {});
        await page.waitForFunction(() => {
            const container = document.querySelector("#div_tariffe");
            if (!container) return true;
            return Boolean(
                container.querySelector(".prezzo_prestazione") ||
                Array.from(container.querySelectorAll(".escort-col-sx p, .escort-col-dx p"))
                    .some((node) => `${node.textContent || ""}`.replace(/\s+/g, " ").trim())
            );
        }, { timeout: 6000 }).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 250));

        const data = await page.evaluate((detailsConfig) => {
            const clean = (text) => `${text || ""}`.replace(/\s+/g, " ").trim();
            const normalize = (value) => clean(value)
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/gi, " ")
                .trim()
                .toLowerCase();
            const absoluteUrl = (url) => {
                try {
                    return url ? new URL(url, window.location.href).href : "";
                } catch {
                    return "";
                }
            };
            const valueAfterLabel = (label) => {
                const normalizeLabel = (value) => clean(value)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/gi, " ")
                    .trim()
                    .toLowerCase();
                const target = normalizeLabel(label);
                const labels = Array.from(document.querySelectorAll(".dett-col-int .p, .dett-row > .p"));
                for (const labelNode of labels) {
                    if (normalizeLabel(labelNode.textContent) !== target) continue;
                    const field = labelNode.closest(".dett-col-int") || labelNode.parentElement;
                    if (!field) continue;
                    const value = Array.from(field.querySelectorAll(".button, .spec-value"))
                        .filter((node) => node !== labelNode && node.closest(".dett-col-int") === field)
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
            const ageText = valueAfterLabel("Età") || clean(document.body?.innerText).match(/\bEt[aà]\s*:\s*\d{1,2}\s*anni\b/i)?.[0] || "";

            const tariffByLabel = new Map(detailsConfig.tariffs.map(([id, label]) => [normalize(label), `${id}`]));
            const serviceByLabel = new Map(detailsConfig.services.map(([id, label]) => [normalize(label), `${id}`]));
            const selectByLabel = new Map(detailsConfig.selects.map(([groupId, label, options]) => [
                normalize(label),
                { groupId: `${groupId}`, options: new Map(options.map(([id, text]) => [normalize(text), `${id}`])) }
            ]));
            const multiByLabel = new Map(detailsConfig.multiSelects.map(([groupId, label, options]) => [
                normalize(label),
                { groupId: `${groupId}`, options: new Map(options.map(([id, text]) => [normalize(text), `${id}`])) }
            ]));
            const details = {
                tariffs: {}, services: {}, selects: {}, multiSelects: {},
                raw: { tariffs: [], services: [], specifications: {} }
            };

            const addRawValue = (target, value) => {
                const cleaned = clean(value);
                if (cleaned && !target.includes(cleaned)) target.push(cleaned);
            };
            const recordTariff = (label, price, rawLine = "") => {
                const normalizedPrice = clean(price).match(/\d{1,7}/)?.[0] || "";
                const id = tariffByLabel.get(normalize(label));
                addRawValue(details.raw.tariffs, rawLine || `${clean(label)} - ${normalizedPrice} €`);
                if (id && normalizedPrice) details.tariffs[id] = normalizedPrice;
            };

            // Prefer Moscarossa's explicit price nodes. This keeps working even
            // when the surrounding paragraph is hidden or its <br> line breaks
            // are not represented by innerText in the current browser build.
            Array.from(document.querySelectorAll("#div_tariffe .prezzo_prestazione")).forEach((priceNode) => {
                let label = "";
                let sibling = priceNode.previousSibling;
                while (sibling && sibling.nodeName !== "BR") {
                    label = `${sibling.textContent || ""}${label}`;
                    sibling = sibling.previousSibling;
                }
                label = clean(label).replace(/\s*-\s*$/, "");
                recordTariff(label, priceNode.textContent);
            });

            Array.from(document.querySelectorAll("#div_tariffe .escort-col-sx p"))
                .flatMap((node) => `${node.innerText || node.textContent || ""}`.split(/\r?\n/))
                .map(clean).filter(Boolean).forEach((line) => {
                    addRawValue(details.raw.tariffs, line);
                    const match = line.match(/^(.+?)\s*-\s*(\d{1,7})(?:[.,]\d+)?\s*(?:€)?\s*$/);
                    if (match) recordTariff(match[1], match[2], line);
                });

            Array.from(document.querySelectorAll("#div_tariffe .escort-col-dx p, #div_dettagli .escort-col-sx p"))
                .flatMap((node) => `${node.innerText || node.textContent || ""}`.split(/\r?\n/))
                .map(clean).filter(Boolean).forEach((line) => {
                    addRawValue(details.raw.services, line);
                    const id = serviceByLabel.get(normalize(line));
                    if (id) details.services[id] = { enabled: true, supplement: "" };
                });

            Array.from(document.querySelectorAll(".dett-col-int")).forEach((field) => {
                const label = clean(field.querySelector(".p")?.textContent).replace(/:\s*$/, "");
                const value = [...new Set(Array.from(field.querySelectorAll(".spec-value, .button"))
                    .map((node) => clean(node.textContent)).filter(Boolean))].join(", ");
                if (!label || !value) return;
                details.raw.specifications[label] = value;
                const selectGroup = selectByLabel.get(normalize(label));
                if (selectGroup) {
                    const optionId = selectGroup.options.get(normalize(value));
                    if (optionId) details.selects[selectGroup.groupId] = optionId;
                    return;
                }
                const multiGroup = multiByLabel.get(normalize(label));
                if (!multiGroup) return;
                const optionIds = value.split(/[,;/\n]+/)
                    .map((item) => multiGroup.options.get(normalize(item))).filter(Boolean);
                if (optionIds.length) details.multiSelects[multiGroup.groupId] = [...new Set(optionIds)];
            });

            const climateValue = valueAfterLabel("Ambiente climatizzato");
            const detailsDiagnostics = {
                tariffContainer: Boolean(document.querySelector("#div_tariffe")),
                tariffPriceNodes: document.querySelectorAll("#div_tariffe .prezzo_prestazione").length,
                tariffTextLength: clean(document.querySelector("#div_tariffe")?.textContent).length,
                specificationFields: document.querySelectorAll(".dett-col-int").length
            };

            return {
                title: clean(document.querySelector("#p_titolo")?.innerText),
                description: clean(document.querySelector("#p_testo")?.innerText),
                name: clean(document.querySelector(".escort-dett-inside-in h2")?.innerText),
                age: ageText.match(/\d{1,2}/)?.[0] || "",
                city: valueAfterLabel("Città"),
                phone: telLink?.getAttribute("href") || "",
                whatsapp: whatsappLinks.length > 0,
                whatsappLinks,
                category: gender,
                airConditioned: normalize(climateValue) === "si" || Boolean(document.querySelector("[title*='climatizzato' i]")),
                details,
                detailsDiagnostics,
                images: [...new Set(images)].slice(0, 20),
                remotePostID,
                url: window.location.href
            };
        }, MOSCAROSSA_DETAILS_CONFIG);

        const phone = normalizePhone(data.phone);
        if (!phone) throw new Error("L'annuncio Moscarossa non contiene un numero di telefono leggibile.");
        if (!data.title || !data.description) {
            throw new Error("Titolo o descrizione non trovati nella pagina Moscarossa.");
        }

        const remotePostID = data.remotePostID || finalUrl.remotePostID || requested.remotePostID;
        if (!remotePostID) {
            throw new Error("Identificativo remoto non trovato nella pagina pubblica Moscarossa.");
        }

        const detailsSummary = {
            tariffs: Object.keys(data.details?.tariffs || {}).length,
            services: Object.keys(data.details?.services || {}).length,
            selects: Object.keys(data.details?.selects || {}).length,
            multi: Object.values(data.details?.multiSelects || {}).reduce(
                (total, values) => total + (Array.isArray(values) ? values.length : 0), 0
            )
        };
        console.log("[moscarossa:scrape] Ulteriori specifiche extracted", {
            ...detailsSummary,
            diagnostics: data.detailsDiagnostics
        });
        if (!Object.values(detailsSummary).some((count) => count > 0)) {
            console.warn("[moscarossa:scrape] No supported Ulteriori specifiche found on the public page.");
        }

        const imageFiles = await downloadMoscarossaImages(data.images, phone, remotePostID, data.url || finalUrl.url);
        return {
            ...data,
            ...requested,
            remotePostID,
            url: data.url || finalUrl.url,
            phone,
            category: normalizeCategory(data.category),
            location: data.city,
            detailsSummary,
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
