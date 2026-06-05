const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { downloadImages } = require("./backer");
const path = require('path');

const { RESIDENTIAL_PROXY } = require('../../const')
const DEFAULT_URL = "https://milano.trovagnocca.com/cerco-trans/arianna-vogue-trans-argentina-milano-zona-9158552/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
}

function firstNonEmpty(...values) {
    for (const value of values) {
        const cleaned = cleanText(value);
        if (cleaned) return cleaned;
    }
    return "";
}

function uniq(values) {
    return [...new Set(values.filter(Boolean))];
}

function photoIdentity(value) {
    try {
        const parsed = new URL(value);
        parsed.search = "";
        parsed.hash = "";
        return parsed.href.replace(/\/[BT]_([^/]+)$/i, "/$1");
    } catch {
        return cleanText(value).replace(/\?.*$/, "").replace(/\/[BT]_([^/]+)$/i, "/$1");
    }
}

function uniqPhotoUrls(values) {
    const seen = new Set();
    const result = [];

    for (const value of values) {
        const imageUrl = cleanText(value);
        const identity = photoIdentity(imageUrl);

        if (!imageUrl || seen.has(identity)) {
            continue;
        }

        seen.add(identity);
        result.push(imageUrl);
    }

    return result;
}

function titleCaseWords(value) {
    return cleanText(value)
        .toLowerCase()
        .replace(/\b([a-z])/gi, (match) => match.toUpperCase());
}

function absoluteUrl(value, baseUrl) {
    const url = cleanText(value);
    if (!url || url.startsWith("data:") || url.startsWith("blob:")) return "";

    try {
        return new URL(url, baseUrl).href;
    } catch {
        return "";
    }
}

function normalizePhone(value) {
    const phone = firstNonEmpty(value);
    if (!phone) return "";
    return phone.replace(/[^\d+]/g, "").replace(/^\+39/, "").replace(/^0039/, "");
}

function extractPhoneFromUrl(value) {
    const text = firstNonEmpty(value);
    if (!text) return "";

    const match = text.match(/(?:tel:|t\.me\/|phone=|[?&]text=.*?)(?:\+39|0039)?\s*(3\d{8,10})/i);
    if (match) return normalizePhone(match[1]);

    return normalizePhone(text);
}

function getTextBySelectors($, selectors) {
    for (const selector of selectors) {
        const text = cleanText($(selector).first().text());
        if (text) return text;
    }
    return "";
}

function getMeta($, name) {
    return firstNonEmpty(
        $(`meta[property="${name}"]`).attr("content"),
        $(`meta[name="${name}"]`).attr("content")
    );
}

function toEnglishAttributeKey(key) {
    const normalized = cleanText(key).toLowerCase();
    const map = {
        "eta": "age",
        "età": "age",
        "su di me": "aboutMe",
        "servizi": "services",
        "luogo di servizio": "serviceLocations",
        "i tuoi tag": "tags",
        "pubblicato il": "publishedAt"
    };

    return map[normalized] || key;
}

function extractAttributes($) {
    const attributes = {};

    const detailText = cleanText($(".detailtag").first().text());
    const ageMatch = detailText.match(/(\d+)\s*anni/i);
    if (ageMatch) attributes.age = ageMatch[1];

    $(".container_tags").each((i, container) => {
        let currentTitle = "";

        $(container).children().each((j, child) => {
            const $child = $(child);
            const text = cleanText($child.text());
            if (!text) return;

            if ($child.hasClass("title")) {
                currentTitle = toEnglishAttributeKey(text);
                if (!attributes[currentTitle]) attributes[currentTitle] = [];
                return;
            }

            if ($child.hasClass("btn_tag") && currentTitle) {
                attributes[currentTitle].push(text);
                return;
            }

            if ($child.is("hr")) currentTitle = "";
        });
    });

    $("table tr, dl, .scheda li, .details li, .info li, .attributes li, .features li, .list-group-item").each((i, el) => {
        const rowText = cleanText($(el).text());
        const key = cleanText($(el).find("th, dt, strong, b, .label, .name").first().text()).replace(/:$/, "");
        const value = cleanText($(el).find("td, dd, span, .value").last().text());
        const englishKey = toEnglishAttributeKey(key);

        if (englishKey && value && englishKey.toLowerCase() !== value.toLowerCase()) {
            attributes[englishKey] = value;
            return;
        }

        const parts = rowText.split(":").map(cleanText);
        if (parts.length >= 2 && parts[0] && parts.slice(1).join(":")) {
            attributes[toEnglishAttributeKey(parts[0])] = parts.slice(1).join(":");
        }
    });

    for (const [key, value] of Object.entries(attributes)) {
        if (Array.isArray(value)) attributes[key] = uniq(value);
    }

    return attributes;
}

function parseLocationFromUrl(url) {
    try {
        const parsed = new URL(url);
        const city = parsed.hostname.split(".")[0];
        const pathPart = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
        const zoneMatch = pathPart.match(/^([a-zA-ZÀ-ÿ]+)\d+/);

        return {
            location: city ? city.charAt(0).toUpperCase() + city.slice(1) : "",
            city: zoneMatch ? zoneMatch[1].charAt(0).toUpperCase() + zoneMatch[1].slice(1) : ""
        };
    } catch {
        return { location: "", city: "" };
    }
}

function parseLocationFromHost(url) {
    try {
        const parsed = new URL(url);
        const city = parsed.hostname.split(".")[0];

        return {
            location: titleCaseWords(city),
            city: titleCaseWords(city)
        };
    } catch {
        return { location: "", city: "" };
    }
}

function normalizeCategory(value) {
    const text = cleanText(value).toLowerCase();

    if (!text) {
        return "";
    }

    if (text.includes("trans") || text.includes("trav")) {
        return "trans";
    }

    if (text.includes("massagg")) {
        return "massaggi";
    }

    if (text.includes("gay")) {
        return "gay";
    }

    if (text.includes("copp")) {
        return "coppia";
    }

    if (text.includes("gigolo")) {
        return "gigolo";
    }

    if (text.includes("escort") || text.includes("donna")) {
        return "escort";
    }

    return text.replace(/^cerco-/, "").replace(/-/g, " ");
}

function parseCategoryFromUrl(url) {
    try {
        const parsed = new URL(url);
        const categorySlug = decodeURIComponent(parsed.pathname.split("/").filter(Boolean)[0] || "");
        return normalizeCategory(categorySlug);
    } catch {
        return "";
    }
}

async function clickPhoneRevealButtons(page) {
    await page.evaluate(() => {
        const matcher = /(telefono|numero|chiama|mostra|vedi|phone|call|whatsapp|telegram)/i;
        const nodes = Array.from(document.querySelectorAll("button, a, [role='button'], .btn"));

        for (const node of nodes) {
            const text = `${node.textContent || ""} ${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""}`;
            const href = node.getAttribute("href") || "";
            if (matcher.test(text) || matcher.test(href)) {
                try {
                    node.click();
                } catch {
                    // Optional reveal buttons can reject synthetic clicks.
                }
            }
        }
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function extractDynamicData(page, url) {
    return page.evaluate((pageUrl) => {
        const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
        const makeAbsolute = (value) => {
            const src = clean(value);
            if (!src || src.startsWith("data:") || src.startsWith("blob:")) return "";

            try {
                return new URL(src, pageUrl).href;
            } catch {
                return "";
            }
        };
        const pickAttr = (node, names) => {
            for (const name of names) {
                const value = node.getAttribute(name);
                if (value) return value;
            }
            return "";
        };

        const phoneText = clean(document.body.innerText).match(/(?:\+39|0039)?\s*(3\d{2}[\s./-]?\d{3}[\s./-]?\d{3,4})/);
        const images = [];

        document.querySelectorAll("img").forEach((img) => {
            const src = pickAttr(img, ["data-full", "data-large", "data-src", "data-original", "data-lazy", "src"]);
            const current = img.currentSrc || src;
            const abs = makeAbsolute(current);
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;

            if (abs && (!width || width >= 180) && (!height || height >= 180)) images.push(abs);
        });

        document.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href") || "";
            if (/\.(jpe?g|png|webp)(\?|$)/i.test(href)) images.push(makeAbsolute(href));
        });

        return {
            phone: clean(document.querySelector('a[href^="tel:"]')?.getAttribute("href") || "").replace(/^tel:/i, "") ||
                clean(document.querySelector("#value_phone")?.value || "") ||
                clean(
                    document.querySelector("[data-phone], [data-tel], [data-number]")?.getAttribute("data-phone") ||
                    document.querySelector("[data-phone], [data-tel], [data-number]")?.getAttribute("data-tel") ||
                    document.querySelector("[data-phone], [data-tel], [data-number]")?.getAttribute("data-number") ||
                    ""
                ) ||
                (phoneText ? phoneText[0] : ""),
            whatsapp: clean(document.querySelector('a[href*="wa.me"], a[href*="whatsapp"], a[href*="api.whatsapp.com"]')?.getAttribute("href") || ""),
            telegram: clean(document.querySelector('a[href*="t.me"], a[href*="telegram"]')?.getAttribute("href") || ""),
            images: [...new Set(images)]
        };
    }, url);
}

async function scrape(url = DEFAULT_URL) {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: puppeteer.executablePath(),
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--window-size=1366,900",
            `--proxy-server=http://${RESIDENTIAL_PROXY.host}:${RESIDENTIAL_PROXY.port}`
        ],
    });

    const page = await browser.newPage();
    await page.authenticate({
      username: RESIDENTIAL_PROXY.username,
      password: RESIDENTIAL_PROXY.password
    });
    // const screenshotDir = path.join('./screenshots', 'trovagnocca_scrapping');

    try {
        await page.setUserAgent(USER_AGENT);
        await page.setViewport({ width: 1366, height: 900 });
        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
        await page.waitForSelector("body", { timeout: 30000 });
        // await page.screenshot({ path: `${screenshotDir}/1.png`, fullPage: true });
        await clickPhoneRevealButtons(page);

        const html = await page.content();
        const $ = cheerio.load(html);
        const dynamic = await extractDynamicData(page, url);
        const urlLocation = parseLocationFromHost(url);
        const urlCategory = parseCategoryFromUrl(url);

        const title = firstNonEmpty(
            getTextBySelectors($, ["h1", ".title", ".annuncio-title", ".ad-title"]),
            getMeta($, "og:title"),
            $("title").text()
        );
        const description = firstNonEmpty(
            getTextBySelectors($, [
                ".message-detail .ads-details-info > span",
                ".message-detail .ads-details-info",
                ".message-detail span.mb151",
                ".descrizione",
                ".description",
                ".desc",
                ".testo",
                ".annuncio-text",
                ".ad-description",
                "article p",
                "main p"
            ]),
            getMeta($, "description"),
            getMeta($, "og:description")
        );
        const phone = normalizePhone(firstNonEmpty(
            $("#value_phone").attr("value"),
            $('a[href^="tel:"]').attr("href")?.replace(/^tel:/i, ""),
            dynamic.phone
        ));
        const whatsapp = absoluteUrl(firstNonEmpty(
            $('a[href*="wa.me"], a[href*="whatsapp"], a[href*="api.whatsapp.com"]').attr("href"),
            dynamic.whatsapp
        ), url);
        const telegram = absoluteUrl(firstNonEmpty(
            $('a[href*="t.me"], a[href*="telegram"]').attr("href"),
            dynamic.telegram
        ), url);
        const telegramNumber = extractPhoneFromUrl(telegram);
        const adId = firstNonEmpty(
            $("#value_adId").attr("value"),
            cleanText($(".panel-details:contains('Id Annuncio') span").first().text())
        );
        const category = normalizeCategory(firstNonEmpty(
            urlCategory,
            cleanText($(".detailtag [title]").first().attr("title")),
            cleanText($(".detailtag strong span").first().text()),
            getTextBySelectors($, [
                '.breadcrumb li:contains("Donna")',
                '.breadcrumb li:contains("donna")',
                ".category",
                ".categoria"
            ]),
            "Uomo cerca donna"
        ));
        const locationText = firstNonEmpty(
            cleanText($(".info-box .item-location .location").first().text()),
            getTextBySelectors($, [".localita", ".luogo", ".zona", ".address"]),
            cleanText($(".detailtag .location").first().text()),
            getMeta($, "og:locality")
        );
        const zoneText = firstNonEmpty(
            cleanText($(".info-box .item-location").parent().find(".mb151").last().text()).replace(/^\|/, ""),
            cleanText($(".detailtag").first().text().split("|").pop())
        );
        const locationParts = locationText.split(",").map(cleanText).filter(Boolean);
        const location = firstNonEmpty(locationParts[0], urlLocation.location);
        const city = firstNonEmpty(locationParts[0], urlLocation.city, location);
        const zone = firstNonEmpty(locationParts[1], zoneText);
        const metaImages = [getMeta($, "og:image"), getMeta($, "twitter:image")].map((src) => absoluteUrl(src, url));
        const htmlImages = [];

        $("#myCarousel .carousel-inner img, #myCarousel img, .carousel-inner img").each((i, el) => {
            const src = firstNonEmpty(
                $(el).attr("data-full"),
                $(el).attr("data-large"),
                $(el).attr("data-src"),
                $(el).attr("data-original"),
                $(el).attr("src")
            );
            const imageUrl = absoluteUrl(src, url);
            if (imageUrl && !/logo|icon|sprite|banner|avatar/i.test(imageUrl)) {
                htmlImages.push(imageUrl.replace("/T_", "/B_"));
            }
        });

        const images = uniqPhotoUrls([...htmlImages, ...dynamic.images, ...metaImages])
            .filter((imageUrl) => /\.(jpe?g|png|webp)(\?|$)/i.test(imageUrl));
        const imageFiles = phone ? await downloadImages(browser, images, phone) : [];
        const attributes = extractAttributes($);
        const nationality = firstNonEmpty(
            Array.isArray(attributes.aboutMe) ? attributes.aboutMe.find((value) => /italian|italiana|italiano|francese|spagnola|brasiliana|latina/i.test(value)) : ""
        );

        return {
            adId,
            title,
            description,
            age: attributes.age || "",
            phone,
            whatsapp,
            telegram: telegramNumber,
            telegramUrl: telegram,
            category,
            location,
            city,
            zone,
            nationality,
            footerCountry: cleanText($("footer .country").first().text()),
            attributes,
            images,
            imageFiles
        };
    } catch (err) {
        console.error("Error:", err.message);
        return null;
    } finally {
        await browser.close();
    }
}

module.exports = { scrape };
