const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { downloadImages } = require("./backer");

const DEFAULT_URL = "https://incontriamoci.xxx/3518105196_i1844584";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

puppeteer.use(StealthPlugin());

function parseIncontriamociAdUrl(url) {
  const match = `${url || ""}`.match(/\/(\d+)_i(\d+)(?:[/?#]|$)/);

  return {
    remotePostID: match ? `${match[1]}_i${match[2]}` : "",
    phoneFromUrl: match ? match[1] : "",
    adId: match ? match[2] : ""
  };
}

async function clickPhoneButton(page) {
  const clicked = await page.evaluate(() => {
    const isVisible = (node) => {
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const button = Array.from(document.querySelectorAll("button, a"))
      .find((node) => isVisible(node) && /telefono/i.test(node.textContent || ""));

    if (!button) return false;
    button.scrollIntoView({ block: "center", inline: "nearest" });
    button.click();
    return true;
  });

  if (!clicked) return false;

  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return document.querySelector("a[href^='tel:']") || /\+?\d[\d\s().-]{7,}\d/.test(text);
  }, { timeout: 8000 }).catch(() => null);

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
    await page.waitForSelector("body", { timeout: 10000 });
    await clickPhoneButton(page);

    const parsedUrl = parseIncontriamociAdUrl(page.url());
    const data = await page.evaluate(() => {
      const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
      const keyOf = (value) => clean(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const abs = (value) => value ? new URL(value, window.location.href).href : "";
      const findPhone = (text) => {
        const match = clean(text).match(/\+?\d[\d\s().-]{7,}\d/);
        return match ? match[0].replace(/[^\d+]/g, "") : "";
      };
      const findWhatsappNumber = (links, text) => {
        for (const link of links) {
          const decodedHref = decodeURIComponent(link.href);
          const phoneParam = decodedHref.match(/[?&]phone=(\+?\d+)/i);
          if (phoneParam) return phoneParam[1];

          const waPath = decodedHref.match(/(?:wa\.me|whatsapp\.com\/send)\/(\+?\d+)/i);
          if (waPath) return waPath[1];

          const hrefNumber = decodedHref.match(/\+?\d[\d\s().-]{7,}\d/);
          if (hrefNumber) return hrefNumber[0].replace(/[^\d+]/g, "");
        }

        const whatsappText = clean(text).match(/whats?app\D{0,40}(\+?\d[\d\s().-]{7,}\d)/i);
        return whatsappText ? whatsappText[1].replace(/[^\d+]/g, "") : "";
      };

      const rawBodyText = document.body.innerText || "";
      const bodyText = clean(rawBodyText);
      const title =
        clean(document.querySelector("h1.titolo-annuncio")?.textContent) ||
        clean(document.querySelector("h1")?.textContent) ||
        clean(document.querySelector("h2")?.textContent) ||
        clean(document.title);

      const info = {};
      const saveInfo = (label, value) => {
        const key = keyOf(label);
        const val = clean(value);
        if (key && val && key.length <= 40 && !info[key]) info[key] = val;
      };

      rawBodyText.split(/\n+/).forEach((line) => {
        const match = clean(line).match(/^([^:]{2,40})\s*:\s*(.+)$/);
        if (match) saveInfo(match[1], match[2]);
      });

      Array.from(document.querySelectorAll("li, p, div, tr")).forEach((node) => {
        const text = clean(node.innerText || node.textContent);
        const match = text.match(/^([^:]{2,40})\s*:\s*(.+)$/);
        if (match) saveInfo(match[1], match[2]);
      });

      Array.from(document.querySelectorAll("dt")).forEach((node) => {
        saveInfo(node.textContent, node.nextElementSibling?.textContent);
      });

      const getInfo = (label) => info[keyOf(label)] || "";
      const description = clean(document.querySelector("#item-main-body-wrapper #descrizione #description")?.textContent)

      const images = Array.from(document.querySelectorAll("#item-images .inc-masonry-grid img[src], #item-images img[src]"))
        .map((img) => abs(img.getAttribute("src")))
        .filter(Boolean);

      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((a) => ({ text: clean(a.textContent), href: abs(a.getAttribute("href")) }))
        .filter((link) => link.href);

      const phoneLinks = links.filter((link) => /^tel:/i.test(link.href));
      const whatsappLinks = links.filter((link) => /wa\.me|whatsapp/i.test(link.href));
      const phone = phoneLinks.map((link) => link.href.replace(/^tel:/i, "")).find(Boolean) || findPhone(rawBodyText);
      const whatsapp = findWhatsappNumber(whatsappLinks, bodyText);
      const ageText = getInfo("Eta");

      return {
        title,
        phone,
        whatsapp,
        category: getInfo("Categoria"),
        city: getInfo("Citta"),
        area: getInfo("Zona"),
        name: getInfo("Nome"),
        age: parseInt(ageText, 10) || null,
        ageText,
        ethnicity: getInfo("Etnia"),
        nationality: getInfo("Nazionalita"),
        breastSize: getInfo("Grandezza Seno"),
        height: getInfo("Altezza"),
        eyes: getInfo("Occhi"),
        hair: getInfo("Capelli"),
        bodyType: getInfo("Tipo di corpo"),
        hourlyPrice: getInfo("Prezzo per ora"),
        specialSigns: getInfo("Segni Particolari"),
        services: getInfo("Servizi"),
        servicesFor: getInfo("Servizi destinati a"),
        servicePlace: getInfo("Luogo di servizio"),
        paymentMethod: getInfo("Modalita di pagamento"),
        info,
        description,
        images: [...new Set(images)],
        phoneLinks,
        whatsappLinks,
        url: window.location.href
      };
    });

    const phone = data.phone || parsedUrl.phoneFromUrl;
    const imageFiles = phone ? await downloadImages(browser, data.images, phone) : [];

    return {
      ...parsedUrl,
      ...data,
      phone,
      location: data.area || "",
      zone: data.area || "",
      attributes: data.info || {},
      imageFiles
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrape,
  parseIncontriamociAdUrl,
  clickPhoneButton
};
