const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { downloadImages } = require("./backer");

const DEFAULT_URL = "https://amasens.com/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

puppeteer.use(StealthPlugin());

function cleanText(value) {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function normalizePhone(value) {
  const phone = cleanText(value).replace(/[^\d+]/g, "");
  return phone.replace(/^\+39/, "").replace(/^0039/, "");
}

function parseAmasensAdUrl(url) {
  const raw = `${url || ""}`;
  const numericParts = raw.match(/(?:^|[^\d])(3\d{8,10})(?:[^\d]|$)/g) || [];
  const phoneFromUrl = numericParts
    .map((part) => normalizePhone(part))
    .find((part) => /^3\d{8,10}$/.test(part)) || "";

  return {
    remotePostID: "",
    phoneFromUrl,
    adId: ""
  };
}

async function acceptTermsIfPresent(page) {
  const selector = [
    "#accetta-condizioni-modal #accetto",
    "#accetta-condizioni-modal a.accetto",
    "a[href*='accetta-condizioni'][href*='accetto=1']"
  ].join(", ");

  const button = await page.waitForSelector(selector, { visible: true, timeout: 5000 }).catch(() => null);
  if (!button) return false;

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null),
    page.evaluate((buttonSelector) => {
      const node = document.querySelector(buttonSelector);
      if (node) node.click();
    }, selector)
  ]);
  return true;
}

async function scrape(url = DEFAULT_URL) {
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

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await acceptTermsIfPresent(page);
    await page.waitForSelector("body", { timeout: 10000 });

    const parsedUrl = parseAmasensAdUrl(page.url());
    const data = await page.evaluate(() => {
      const clean = (value) => `${value || ""}`.replace(/\s+/g, " ").trim();
      const abs = (value) => {
        try {
          return value ? new URL(value, window.location.href).href : "";
        } catch {
          return "";
        }
      };
      const normalizePhone = (value) => clean(value).replace(/[^\d+]/g, "").replace(/^\+39/, "").replace(/^0039/, "");
      const findPhone = (text) => {
        const match = clean(text).match(/(?:\+39|0039)?\s*(3\d[\d\s().-]{7,}\d)/);
        return match ? normalizePhone(match[1]) : "";
      };
      const textAfterLabel = (label) => {
        const regex = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, "i");
        const rawText = document.body.innerText || "";
        const match = rawText.match(regex);
        return match ? clean(match[1]) : "";
      };
      const splitLocation = (value) => {
        const parts = clean(value).split(",").map((item) => clean(item)).filter(Boolean);
        return {
          city: parts[0] || "",
          location: parts[0] || "",
          region: parts[1] || ""
        };
      };

      const rawBodyText = document.body.innerText || "";
      const bodyText = clean(rawBodyText);
      const title =
        clean(document.querySelector("h1.titolo-annuncio")?.textContent) ||
        clean(document.querySelector("#item h1")?.textContent) ||
        clean(document.querySelector("h1")?.textContent) ||
        clean(document.title);

      const description = Array.from(document.querySelectorAll("#item-left-side .offer-section p, #item .offer-section p, .offer-section p"))
        .map((node) => clean(node.textContent))
        .find((text) => text.length > 40 && !/^categoria\s*:/i.test(text) && !/^indirizzo\s*:/i.test(text)) || "";

      const category = textAfterLabel("Categoria") ||
        clean(Array.from(document.querySelectorAll(".breadcrumb li a, .breadcrumb li span"))
          .map((node) => clean(node.textContent))
          .find((text) => /escort|trans|massaggi|coppie|scambisti/i.test(text)));

      const address = textAfterLabel("Indirizzo");
      const location = splitLocation(address);

      const images = Array.from(document.querySelectorAll("#item-images img[src], .fotorama img[src], img.fotorama__img[src]"))
        .map((img) => abs(img.getAttribute("src")))
        .filter((src) => src && !/affiliate|banner|logo|icons?|facebook|telegram|instagram|youtube|tiktok|linkedin/i.test(src));

      const phoneLinks = Array.from(document.querySelectorAll("a[href^='tel:']"))
        .map((link) => normalizePhone(link.getAttribute("href")));

      const breadcrumbPhone = clean(document.querySelector(".breadcrumb li.last-child span, .breadcrumb li:last-child span, .breadcrumb li:last-child")?.textContent);
      const phone = phoneLinks.find(Boolean) || findPhone(breadcrumbPhone) || findPhone(window.location.href) || findPhone(bodyText);

      const whatsappLinks = Array.from(document.querySelectorAll("a[href*='whatsapp'], a[href*='wa.me']"))
        .map((link) => abs(link.getAttribute("href")))
        .filter(Boolean);

      return {
        title,
        description,
        phone,
        whatsapp: whatsappLinks.length > 0,
        whatsappLinks,
        category,
        address,
        city: location.city,
        location: location.location,
        region: location.region,
        images: [...new Set(images)],
        phoneLinks,
        url: window.location.href
      };
    });

    const phone = data.phone || parsedUrl.phoneFromUrl;
    const imageFiles = phone ? await downloadImages(browser, data.images, phone) : [];

    return {
      ...parsedUrl,
      ...data,
      phone,
      attributes: {
        address: data.address || "",
        region: data.region || ""
      },
      imageFiles
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrape,
  parseAmasensAdUrl
};
