const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
var rootPath;

if (process.env.PROD == 0) {
    rootPath = `${appDir}`
} else {
    rootPath = `${process.env.APP_PATH_PRODUCTION}`
}

puppeteer.use(StealthPlugin());

let screenNum = 1;

// ✅ Residential proxy
const PROXY = {
    host: 'geo.iproyal.com',
    port: '12321',
    username: 'beast1124',
    password: '8hsNLLhAQr9el7QY_country-it'
};

// 📁 screenshot folder
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

// ===== HELPERS =====
function log(step, msg) {
    console.log(`[STEP ${step}] ${msg}`);
}

async function takeShot(page, name) {
    const file = path.join(SCREENSHOT_DIR, `${screenNum}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    screenNum++;
    console.log("📸 Screenshot:", file);
}

async function saveHTML(page, name) {
    const html = await page.content();
    const file = path.join(SCREENSHOT_DIR, `${name}.html`);
    fs.writeFileSync(file, html);
    console.log("📄 HTML:", file);
}

// ===== WAIT FULL RENDER =====
async function waitTillHTMLRendered(page, timeout = 30000) {
    const checkTime = 1000;
    let lastSize = 0;
    let stable = 0;

    for (let i = 0; i < timeout / checkTime; i++) {
        const html = await page.content();
        const size = html.length;

        if (size === lastSize) stable++;
        else stable = 0;

        if (stable >= 3) break;

        lastSize = size;
        await new Promise(r => setTimeout(r, checkTime));
    }
}

async function downloadImages(browser, images, phone) {
    const savedFiles = [];

    for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];

        try {
            const imgPage = await browser.newPage();

            await imgPage.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
            );

            const response = await imgPage.goto(imageUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            if (!response) {
                throw new Error('No response');
            }

            const status = response.status();
            const headers = response.headers();
            const contentType = headers['content-type'] || '';

            if (status !== 200) {
                throw new Error(`Status ${status}`);
            }

            if (!contentType.startsWith('image/')) {
                const text = await response.text().catch(() => '');
                throw new Error(`Not image. content-type=${contentType}. body=${text.slice(0, 200)}`);
            }

            const buffer = await response.buffer();

            const PHONE_DIR = `${rootPath}/girls/${phone}`;
            const PIC_DIR = `${PHONE_DIR}/pics`;

            if (!fs.existsSync(PHONE_DIR)) fs.mkdirSync(PHONE_DIR);
            if (!fs.existsSync(PIC_DIR)) fs.mkdirSync(PIC_DIR);

            let ext = 'jpg';
            if (contentType.includes('png')) ext = 'png';
            else if (contentType.includes('webp')) ext = 'webp';
            else if (contentType.includes('gif')) ext = 'gif';
            else if (contentType.includes('jpeg')) ext = 'jpg';

            const fileName = `${i}.${ext}`;
            const filePath = path.join(PIC_DIR, fileName);

            fs.writeFileSync(filePath, buffer);
            savedFiles.push(fileName);

            console.log(`✅ Saved image: ${fileName}`);

            await imgPage.close();
        } catch (err) {
            console.error(`❌ Error downloading ${imageUrl}: ${err.message}`);
        }
    }

    return savedFiles;
}

// ===== MAIN =====
async function scrape(url) {
    let browser;

    try {
        log(1, puppeteer.executablePath(), "Launching browser...");

        browser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                // '--disable-blink-features=AutomationControlled',
                // '--disable-dev-shm-usage',
                // '--disable-infobars',
                // '--disable-web-security',
                // '--disable-features=IsolateOrigins,site-per-process',
                // '--window-size=1920,1080',
                `--proxy-server=http://${PROXY.host}:${PROXY.port}`
            ],
            defaultViewport: null,
        });

        const page = await browser.newPage();

        // proxy auth
        await page.authenticate({
            username: PROXY.username,
            password: PROXY.password
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        );
        // await page.setViewport({ width: 1366, height: 768 });
        await takeShot(page, "start");

        // ===== HOMEPAGE (IMPORTANT) =====
        // log(2, "Opening homepage...");
        // await page.goto('https://www.bakeca.it', { waitUntil: 'domcontentloaded' });
        // await new Promise(r => setTimeout(r, 4000));
        // await takeShot(page, "homepage");

        // ===== TARGET =====
        log(3, "Opening target...");
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await takeShot(page, "target_loaded");

        // ===== CLOUDFLARE =====
        log(4, "Waiting Cloudflare...");
        const hasCloudFlare = await page.waitForFunction(() => {
            return !document.body.innerText.includes('Enable JavaScript') &&
                !document.body.innerText.includes('Verifying you are human');
        }, { timeout: 30000 }).then(() => true)
            .catch(() => false);

        await new Promise(r => setTimeout(r, 2000));
        await takeShot(page, "after_cloudflare");
        await saveHTML(page, "after_cloudflare");

        // if(hasCloudFlare){
        //     console.log(hasCloudFlare,'hasCloudFlare')
        //     await new Promise(r => setTimeout(r, 2000));
        //     return;    
        // }

        // ===== COOKIE ACCEPT =====
        // try {
        //     const btn = await page.$('.iubenda-cs-accept-btn');
        //     if (btn) {
        //         log(5, "🍪 Accepting cookies...");
        //         await btn.click();
        //         await new Promise(r => setTimeout(r, 2000));
        //     } else {
        //         log(5, "No cookie popup");
        //     }
        // } catch (e) {
        //     log(5, "Cookie click error");
        // }

        // ===== SCROLL (LAZY LOAD) =====
        log(6, "Scrolling...");
        await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(r => setTimeout(r, 1500));
            }
        });

        // ===== WAIT IMAGES =====
        log(7, "Waiting images...");
        const hasImages = await page.waitForFunction(() => {
            return document.querySelectorAll('#annuncio_foto a[data-fancybox]').length > 0;
        }, { timeout: 10000 })
            .then(() => true)
            .catch(() => false);

        // log(7, `Images found: ${hasImages}`);

        // ===== FULL RENDER =====
        log(8, "Waiting render...");
        await waitTillHTMLRendered(page);
        await takeShot(page, "after_render");

        // ===== WAIT FORM =====
        // await page.waitForSelector('input[name="titolo"]', {
        //     timeout: 30000,
        //     visible: true
        // });

        await takeShot(page, "form_ready");

        // ===== SCRAPE =====
        log(9, "Scraping...");

        const data = await page.evaluate(() => {
            const text = (sel) => {
                const el = document.querySelector(sel);
                return el ? el.textContent.trim() : '';
            };

            const title = text('.page__title');
            const description = text('#annuncio_descrizione');

            let city = '';
            document.querySelectorAll('.meta-block').forEach(block => {
                const label = block.querySelector('.meta-label')?.textContent?.trim();
                if (label === 'Comune') {
                    city = block.textContent.replace('Comune', '').trim();
                }
            });
            const phoneBtn = document.querySelector('[data-button="call-phone-number"]');
            const phone = phoneBtn?.querySelector('span')?.textContent?.trim() || '';

            const images = Array.from(
                document.querySelectorAll('#annuncio_foto a[data-fancybox]')
            ).map(a => a.href);

            return {
                title,
                description,
                city,
                phone,
                images
            };
        });

        log(10, "Done");

        log(11, "Downloading images...");
        const imageFiles = await downloadImages(browser, data.images, data.phone);
        await takeShot(page, "final");
        screenNum = 1;
        await browser.close();
        return { ...data, imageFiles };
    } catch (err) {
        screenNum = 1;
        console.error("❌ ERROR:", err.message);
        if (browser) await browser.close();
    }
}

module.exports = {
    scrape,
    downloadImages
};