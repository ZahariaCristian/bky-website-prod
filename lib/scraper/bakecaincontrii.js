const axios = require("axios");
const cheerio = require("cheerio");

function normalizePhone(phone) {
    return phone
        .replace(/\+39/g, '')   // remove +39
        .replace(/\D/g, '')     // remove all non-numbers
        .slice(0, 10);          // keep only 10 digits
}
async function scrape(url) {
    try {
        try {
            const res = await axios.get(url);
            data = res.data;
        } catch (err) { return null };
        //console.log("Fetched HTML:", data); // Log full HTML response to inspect

        const $ = cheerio.load(data);

        let images = [];
        const galleryScript = $('skokka-gallery').attr(':items');
        if (galleryScript) {
            // Remove the HTML entities and convert it to a JavaScript array
            const cleanScript = galleryScript.replace(/&#x27;/g, "'").replace(/'/g, '"');
            const imageArray = JSON.parse(cleanScript);
            images = Array.isArray(imageArray) ? imageArray : [];
        }

        let scrapingResult = {
            title: $(".main-title").html(),
            description: $("div.col.service-detail > p").html(),
            age: $("#app > main > div > div.container.pt-0 > div > div.col > div.detail.tagcard > span:nth-child(1) > b").html(),
            city: $("span.badge-pill.notranslate > b").html(),
            location: $("#app > main > div > div.container.pt-0 > div > div.col > div > span.badge-pill.notranslate").html(),
            phone: normalizePhone($("phone-button").attr("number"))
        };
        
        if (scrapingResult.phone == undefined) scrapingResult.phone = makePhone(10);
        for (let r in scrapingResult)
            if (scrapingResult[r] != null) scrapingResult[r] = scrapingResult[r].trim().replace(/<br>/g, "\n").replace(/&amp;/g, "&");

        scrapingResult.images = images;
        scrapingResult.checkPhone = $("phone-button").attr("number") != undefined
        scrapingResult.location = scrapingResult.location.split('/').reverse()[0] === "b>" ? scrapingResult.location : scrapingResult.location.split('/').reverse()[0]
        scrapingResult.age = parseInt(scrapingResult.age.split(" ")[0]);
        scrapingResult.whatsapp = $("whatsapp-button").html() !== null;

        // console.log(scrapingResult)
        return scrapingResult;
    } catch (err) {
        console.log(err)
    }
}

function makePhone(length) {
    var result = '';
    var characters = '0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

async function scrapeTimePublication(remoteID) {
    try {
        const res = await axios.get("https://bakecaincontrii.com/u/purchase-summary/" + remoteID);//TODO: era bari
        data = res.data;
    } catch (err) { return null };
    const $ = cheerio.load(data);

    let scrapingResult = {
        date: $(".calendar .date").html(),
        time: $("td .active").html()
    };
    for (let r in scrapingResult)
        if (scrapingResult[r] != null) scrapingResult[r] = scrapingResult[r].trim().replace(/<br>/g, "\n").replace(/&amp;/g, "&");

    return scrapingResult;
}

module.exports = {
    scrape,
    scrapeTimePublication
};