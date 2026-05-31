const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const { downloadImages } = require("./backer");

const DEFAULT_BASIC_AUTH = {
    username: "raffaele",
    password: "1wBm19wgg\\23"
};

function cleanText(value) {
    return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function normalizeUrl(url) {
    if (!url) return "";
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return `https://megaescort.info${url}`;
    return url;
}

function getBasicAuth() {
    const username = (process.env.ADSPEED_BASIC_AUTH_USER || DEFAULT_BASIC_AUTH.username || "").trim();
    const password = process.env.ADSPEED_BASIC_AUTH_PASS || DEFAULT_BASIC_AUTH.password || "";
    return username ? { username, password } : null;
}

async function scrape(url) {
    const browser = await puppeteer.launch({
        headless: "new", // use true if issues
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    try {
        const basicAuth = getBasicAuth();
        if (basicAuth) {
            await page.authenticate(basicAuth);
        }

        // Make it look like real browser
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        );

        await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        // Wait for content to load
        await page.waitForSelector("h1");

        const html = await page.content();
        const $ = cheerio.load(html);

        // TITLE
        const title = cleanText($(".page-title").first().text()) || cleanText($("h1").first().text());

        // DESCRIPTION
        const description = cleanText($(".desc-text").text()) || cleanText($(".descr p").text());

        // PHONE
        const phoneHref = $('a[href^="tel:"]').attr("href");
        let phone = phoneHref ? phoneHref.replace("tel:", "") : "";

        // 🔥 Remove country code (+39)
        phone = phone.replace(/[^\d+]/g, "").replace(/^\+\d{2}/, "");

        // WHATSAPP
        const whatsapp = $('a[href*="wa.me"], a[href*="whatsapp"]').attr("href");

        // CATEGORY & LOCATION
        let category = cleanText($(".sb-label").filter((i, el) => cleanText($(el).text()).toLowerCase() === "categoria").next(".sb-value").text());
        let location = "";
        let city = "";
        let zone = "";

        const whereText = cleanText($(".sb-label").filter((i, el) => cleanText($(el).text()).toLowerCase() === "dove").next(".sb-value").text());
        if (whereText) {
            const parts = whereText.split(",").map(s => cleanText(s)).filter(Boolean);
            zone = parts[0] || "";
            city = parts[1] || parts[0] || "";
            location = parts[1] || parts[0] || "";
        }

        $(".tag-box .item").each((i, el) => {
            const key = cleanText($(el).find("strong").text()).toLowerCase();
            const value = cleanText($(el).find("span").text());
            if (!category && key.includes("categoria")) category = value;
            if (!whereText && key.includes("dove")) {
                const parts = value.split(",").map(s => cleanText(s)).filter(Boolean);
                zone = parts[0] || "";
                city = parts[1] || parts[0] || "";
                location = parts[1] || parts[0] || "";
            }
        });

        // ATTRIBUTES
        const attributes = {};
        $(".info-grid .info-row").each((i, el) => {
            const key = cleanText($(el).find(".info-key").text());
            const value = cleanText($(el).find(".info-val").text());
            if (key && value) attributes[key] = value;
        });

        $(".tags .badge").each((i, el) => {
            const text = cleanText($(el).text());
            const [key, value] = text.split(":").map(s => s.trim());
            if (key && value) attributes[key] = value;
        });

        const images = new Set();
        $(".gallery img, .js-gallery-item, #main_carousel img").each((i, el) => {
            let img = normalizeUrl($(el).attr("data-large") || $(el).attr("src"));
            if (img) {
                // 🔥 Fix relative URL → full URL
                images.add(img);
            }
        });

        const imageList = Array.from(images);
        const imageFiles = await downloadImages(browser, imageList, phone);
        return {
            title,
            description,
            phone,
            whatsapp,
            category,
            city,
            location,
            zone,
            attributes,
            images: imageList,
            imageFiles
        };
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await browser.close();
    }
}

module.exports = {
    scrape
}
