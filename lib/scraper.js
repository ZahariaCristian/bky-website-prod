const axios = require("axios");
const cheerio = require("cheerio");
const xpath = require("xpath");
const { DOMParser } = require("xmldom");

function normalizePhone(rawPhone) {
    if (typeof rawPhone !== "string") return null;
    const digitsOnly = rawPhone
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, "")
        .replace(/\D/g, "");
    return digitsOnly.length >= 8 ? digitsOnly : null;
}

function pickFirstValidPhone(candidates) {
    for (const candidate of candidates) {
        const normalized = normalizePhone(candidate);
        if (normalized) return normalized;
    }
    return null;
}

function extractPhoneFromRawHtml(html) {
    if (typeof html !== "string" || !html) return null;
    const patterns = [
        /"number"\s*:\s*"([^"]+)"/gi,
        /"phone"\s*:\s*"([^"]+)"/gi,
        /"telephone"\s*:\s*"([^"]+)"/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const normalized = normalizePhone(match[1]);
            if (normalized) return normalized;
        }
    }

    return null;
}

function extractWhatsappFromRawHtml(html) {
    if (typeof html !== "string" || !html) return false;

    const trueFlags = [
        /"hasWhatsapp"\s*:\s*true/i,
        /"hasWhatapp"\s*:\s*true/i,
        /"whatsapp"\s*:\s*true/i,
        /"whatsappAvailable"\s*:\s*true/i
    ];
    for (const pattern of trueFlags) {
        if (pattern.test(html)) return true;
    }

    const linkPatterns = [
        /wa\.me\/\d+/i,
        /api\.whatsapp\.com\/send/i,
        /whatsapp:\/\/send/i
    ];
    for (const pattern of linkPatterns) {
        if (pattern.test(html)) return true;
    }

    return false;
}

function pickFirstNonEmptyText(values) {
    for (const value of values) {
        if (typeof value !== "string") continue;
        const normalized = value.trim();
        if (normalized) return normalized;
    }
    return null;
}

async function scrape(url) {
    try {
        const res = await axios.get(url);
        const data = res.data;
        const $ = cheerio.load(data);

        // Build DOM for XPath
        const doc = new DOMParser({
            errorHandler: { warning: null, error: null, fatalError: null }
        }).parseFromString(data, "text/html");

        // Full XPath for location text node
        const locationNode = xpath.select1(
            "/html/body/div[1]/main/div/div[1]/div/div/div[2]/div[1]/div/span[2]/text()",
            doc
        );
        const locationByXPath = locationNode ? locationNode.nodeValue.trim() : null;

        // Prefer #phone-button > span (new markup), with old selectors as fallback.
        const phoneNode = xpath.select1(
            "/html/body/div[1]/main/div/div[1]/div/div/div[2]/div[3]/div[1]/button/span/text()",
            doc
        );
        const phoneByXPath = phoneNode ? phoneNode.nodeValue : null;
        const phoneBySelector = $("#phone-button > span").first().text();
        const phoneByButtonText = $("#phone-button").first().text();
        const phoneByLegacyAttr = $("phone-button").attr("number") || $("#phone-button").attr("number");
        const phoneByTelHref = $("a[href^='tel:']").first().attr("href");
        const phoneByRawHtml = extractPhoneFromRawHtml(data);
        const scrapedPhone = pickFirstValidPhone([
            phoneBySelector,
            phoneByButtonText,
            phoneByXPath,
            phoneByLegacyAttr,
            phoneByTelHref,
            phoneByRawHtml
        ]);

        // WhatsApp availability: new button id + xpath, with legacy custom-element fallback.
        const whatsappNode = xpath.select1(
            "/html/body/div[1]/main/div/div[1]/div/div/div[2]/div[3]/div[2]/button/div/span/text()",
            doc
        );
        const whatsappByXPath = whatsappNode ? whatsappNode.nodeValue : null;
        const whatsappBySelector = $("#whatsapp-button span").first().text();
        const whatsappByExactSelector = $("#whatsapp-button > div > span").first().text();
        const hasWhatsappButton = $("#whatsapp-button").length > 0 || $("whatsapp-button").length > 0;
        const whatsappHref = $("#whatsapp-button").attr("href")
            || $("#whatsapp-button a").first().attr("href")
            || $("a[href*='wa.me']").first().attr("href")
            || $("a[href*='api.whatsapp.com']").first().attr("href")
            || $("a[href^='whatsapp:']").first().attr("href");
        const whatsappFromHtml = extractWhatsappFromRawHtml(data);
        const whatsappAvailable = hasWhatsappButton
            || /whatsapp/i.test(whatsappBySelector || "")
            || /whatsapp/i.test(whatsappByExactSelector || "")
            || /whatsapp/i.test(whatsappByXPath || "")
            || /wa\.me|api\.whatsapp\.com|whatsapp:/i.test(whatsappHref || "")
            || whatsappFromHtml;

        // Nickname / Nome d'arte: prefer new layout and keep legacy fallbacks.
        const nicknameByProvidedSelector = $("#app > main > div > div.container.pt-0 > div > div > div.nickname-border.p-3 > div.d-flex.flex-row.justify-content-between.align-items-start.mb-3 > div").first().text();
        const nicknameByClass = $(".nickname-title").first().text();
        const nicknameByLegacySelector = $("#app > main > div > div.container.pt-0 > div > div > div.border.rounded.p-3.mb-2 > div.d-flex.flex-row.justify-content-between.align-items-start > div").first().text();
        const scrapedNickname = pickFirstNonEmptyText([
            nicknameByProvidedSelector,
            nicknameByClass,
            nicknameByLegacySelector
        ]);

        // Extract age by searching the page text for "<number> anni"
        let ageNumber = null;
        try {
            const allText = $('body').text();
            const m = allText.match(/(\d{1,2})\s*anni/i);
            if (m) ageNumber = parseInt(m[1], 10);
        } catch {}

        let images = [];
        const galleryScript = $('post-gallery').attr(':items');
        if (galleryScript) {
            const cleanScript = galleryScript.replace(/&#x27;/g, "'").replace(/'/g, '"');
            const imageArray = JSON.parse(cleanScript);
            images = Array.isArray(imageArray) ? imageArray : [];
        }
      
        // Extract data from tags-sections-detail component
        let paymentMethods = [];
        let services = [];
        let about_you = [];
        let attention_to = [];
        let placeofService = [];

        const tagsSectionScript = $('tags-sections-detail').attr(':hierarchy');
        if (tagsSectionScript) {
            const cleanScript = tagsSectionScript.replace(/&#x27;/g, "'").replace(/'/g, '"');
            const hierarchy = JSON.parse(cleanScript);
            
            // Find the payment methods section
            const paymentSection = hierarchy.sections.find(section => section.code === "payment_methods");
            if (paymentSection) {
                paymentMethods = paymentSection.tags.map(tag => tag.code);
            }
            
            // Find the services section
            const servicesSection = hierarchy.sections.find(section => section.code === "services");
            if (servicesSection) {
                services = servicesSection.tags.map(tag => ({
                    code: tag.code,
                    title: tag.title
                }));
            }

            const aboutyouSection = hierarchy.sections.find(section => section.code === "section_about_you");
            if (aboutyouSection) {
                about_you = aboutyouSection.tags.map(tag => ({
                    code: tag.code,
                    title: tag.title
                }));
            }

            const attentionToSection = hierarchy.sections.find(section => section.code === "attention_to");
            if (attentionToSection) {
                attention_to = attentionToSection.tags.map(tag => ({
                    code: tag.code,
                    title: tag.title
                }));
            }

            const placeOfServiceSection = hierarchy.sections.find(section => section.code === "place_of_service");
            if (placeOfServiceSection) {
                placeofService = placeOfServiceSection.tags.map(tag => ({
                    code: tag.code,
                    title: tag.title
                }));
            }
        }

        let scrapingResult = {
            title: $(".main-title").html(),
            description: $("div.col.service-detail > p").html(),
            age: ageNumber,
            city: $("span.badge-pill.notranslate > b").html(),
            nickname: scrapedNickname,
            location: locationByXPath || $("#app > main > div > div.container.pt-0 > div > div > div.nickname-border.p-3 > div:nth-child(2) > div > span.badge-pill.notranslate").text().trim(),
            phone: scrapedPhone,
            paymentMethods: paymentMethods,
            services: services, // Array of service objects with code and title
            about_you: about_you, // Array of about you objects with code and title
            attention_to: attention_to, // Array of attention to objects with code and title
            placeofService: placeofService, // Array of place of service objects with code and title

            hasCardPayment: paymentMethods.includes("credit_card"),
            hasCashPayment: paymentMethods.includes("cash"),
            // Add specific service flags for common services

            hasAnalService: services.some(service => service.code === "anal"),
            hasOralService: services.some(service => service.code === "oral"),
            hasBDSMService: services.some(service => service.code === "bdsm"),
            hasGFExperience: services.some(service => service.code === "girlfriend_experience"),
            hasEroticMassage: services.some(service => service.code === "erotic_massage"),
            hasTantricMassage: services.some(service => service.code === "tantric_massage"),
            hasEiaculazioneSulCorpo: services.some(service => service.code === "body_ejaculation"),
            hasFrenchKiss: services.some(service => service.code === "french_kiss"),
            hasRolePlay: services.some(service => service.code === "role_play"),
            hasVideocall: services.some(service => service.code === "videocall"),
            hasPornActress: services.some(service => service.code === "porn_actresses"),
            hasThreesome: services.some(service => service.code === "threesome"),
            hasSexting: services.some(service => service.code === "sexting"),
            hasFetish: services.some(service => service.code === "fetish"),

            //aboutyou
            isCaucasian: about_you.some(service => service.code === "caucasian"),
            isAsian: about_you.some(service => service.code === "asian"),
            isAfrican: about_you.some(service => service.code === "african"),
            isIndian: about_you.some(service => service.code === "indian"),
            isBlonde: about_you.some(service => service.code === "blond"),
            isCapelliMarroni: about_you.some(service => service.code === "brown"),
            isCapelliNeri: about_you.some(service => service.code === "black"),
            isCapelliRossi: about_you.some(service => service.code === "red"),
            isCurvy: about_you.some(service => service.code === "curvy"),
            isMagro: about_you.some(service => service.code === "slim"),
            isItaliana: about_you.some(service => service.code === "Italiana"),
            isLatina: about_you.some(service => service.code === "latin"),
            isNotOperated: about_you.some(service => service.code === "non_operated"),
            isSenoRifatto: about_you.some(service => service.code === "bigger_breast"),

            //attention to
            perUomini: attention_to.some(service => service.code === "men"),
            perCoppie: attention_to.some(service => service.code === "couples"),
            perDonne: attention_to.some(service => service.code === "women"),
            perDisabili: attention_to.some(service => service.code === "disabled"),

            //place of service
            aCasa: placeofService.some(place => place.code === "at_home"),
            aEventi: placeofService.some(place => place.code === "events_parties"),
            aHotel: placeofService.some(place => place.code === "hotel_motel"),
            aClub: placeofService.some(place => place.code === "clubs"),
            aOutcall: placeofService.some(place => place.code === "outcall"),
        };
    
        if (!scrapingResult.phone) scrapingResult.phone = null;
        
        for (let r in scrapingResult) {
            if (typeof scrapingResult[r] === "string" && scrapingResult[r] != null) {
                scrapingResult[r] = scrapingResult[r].trim().replace(/<br>/g, "\n").replace(/&amp;/g, "&");
            }
        }
        
        scrapingResult.images = images;
        scrapingResult.nickname = scrapingResult.nickname || "Anonimo";
        scrapingResult.checkPhone = !!scrapedPhone;

        // Normalize location (take last segment after "/")
        if (typeof scrapingResult.location === "string" && scrapingResult.location.includes("/")) {
            scrapingResult.location = scrapingResult.location.split("/").pop().trim();
        }

        // Age already numeric; ensure null if NaN
        if (typeof scrapingResult.age !== "number" || Number.isNaN(scrapingResult.age)) {
            scrapingResult.age = null;
        }

        scrapingResult.whatsapp = whatsappAvailable;

        return scrapingResult;
    } catch(err) {
        console.log(err);
        return null;
    }
}

function makePhone(length) {
    var result           = '';
    var characters       = '0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

async function scrapeTimePublication(remoteID) {
    try {
        const res = await axios.get("https://bakecaincontrii.com/u/purchase-summary/" + remoteID);//TODO: era bari
        data = res.data;
    } catch(err) { return null };
    const $ = cheerio.load(data);

    let scrapingResult = {
        date: $(".calendar .date").html(),
        time: $("td .active").html()
    };
    for (let r in scrapingResult)
        if (scrapingResult[r] != null) scrapingResult[r] = scrapingResult[r].trim().replace(/<br>/g, "\n").replace(/&amp;/g, "&");
    
    return scrapingResult;
}

module.exports  = {
    scrape,
    scrapeTimePublication
};
