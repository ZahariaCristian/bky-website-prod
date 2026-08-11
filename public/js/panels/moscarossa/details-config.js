(function (root, factory) {
    const config = factory();
    if (typeof module === "object" && module.exports) module.exports = config;
    else if (root) root.MOSCAROSSA_DETAILS_CONFIG = config;
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    return {
        tariffs: [
            ["185", "A partire da"], ["186", "Incall 15 minuti"], ["187", "Incall 30 minuti"],
            ["188", "Incall 45 minuti"], ["189", "Incall 1 ora"], ["190", "Incall 2 ore"],
            ["191", "Outcall 15 minuti"], ["192", "Outcall 30 minuti"], ["193", "Outcall 45 minuti"],
            ["194", "Outcall 1 ora"], ["195", "Outcall 2 ore"]
        ],
        tariffGroups: [
            ["", ["185"]],
            ["Incall", ["186", "187", "188", "189", "190"]],
            ["Outcall", ["191", "192", "193", "194", "195"]]
        ],
        services: [
            ["184", "Baci alla Francese"], ["214", "Body massage"], ["108", "CIM (venuta in bocca)"],
            ["110", "COB (venuta sul corpo)"], ["109", "COF (venuta in faccia)"], ["98", "Dildo - Toys"],
            ["204", "Dirty talk"], ["196", "Doppia venuta"], ["203", "Foot fetish"], ["202", "Gfe"],
            ["197", "Gioco di Ruolo e Fantasia"], ["99", "Handjob"], ["162", "Kiss"], ["101", "Lingerie"],
            ["213", "Massaggio con olio"], ["102", "Massaggio erotico"], ["114", "Massaggio prostatico"],
            ["212", "Massaggio thai"], ["198", "Notte intera"], ["103", "Orale con preservativo"],
            ["104", "Orale scoperto"], ["105", "Orale scoperto con ingoio"], ["201", "Padrona (Soft)"],
            ["205", "Per coppie etero"], ["199", "Pioggia Dorata (Dare)"], ["200", "Pioggia Dorata (Ricevere)"],
            ["97", "Posizione 69"], ["111", "Rimming"], ["112", "Sesso Anale"], ["222", "Squirting"],
            ["106", "Striptease"], ["215", "Tantra"], ["107", "Titjob"]
        ],
        selects: [
            ["2", "Seno", [["1", "Piccolo"], ["3", "Medio"], ["5", "Grande"]]],
            ["3", "Etnia", [["16", "Araba"], ["13", "Asiatica"], ["11", "Caucasica"], ["15", "Indiana"], ["14", "Latina"], ["17", "Mista"], ["12", "Nera"]]],
            ["5", "Colore capelli", [["20", "Biondi"], ["21", "Castano"], ["18", "Neri"], ["19", "Rossi"]]],
            ["6", "Lunghezza capelli", [["22", "Molto corti"], ["23", "Corti"], ["24", "Lunghi"], ["25", "Molto lunghi"]]],
            ["7", "Altezza", [["26", "Fino a 1.60"], ["27", "Da 1.60 a 1.65"], ["28", "Da 1.66 a 1.70"], ["29", "Da 1.71 a 1.75"], ["30", "Da 1.76 a 1.80"], ["31", "Da 1.81 a 1.85"], ["32", "Da 1.86 a 1.90"], ["33", "Oltre 1.90"]]],
            ["8", "Fumatore/rice", [["35", "No"], ["168", "Occasionale"], ["34", "Si"]]],
            ["9", "Tatuaggi", [["37", "No"], ["36", "Si"]]],
            ["10", "Piercing", [["39", "No"], ["38", "Si"]]],
            ["11", "Fisico", [["40", "Magra"], ["41", "Altletica"], ["42", "Normale"], ["44", "Formosa"], ["46", "Enorme"]]],
            ["13", "Colore occhi", [["73", "Azzurri"], ["72", "Grigi"], ["70", "Marroni"], ["71", "Neri"], ["74", "Verdi"]]],
            ["14", "Disponibilità", [["94", "Incall"], ["95", "Out call"], ["96", "Incall e Out call"]]],
            ["17", "Nazionalità", [["145", "albanese"], ["146", "algerina"], ["127", "argentina"], ["147", "biellorussa"], ["126", "brasiliana"], ["119", "bulgara"], ["211", "capoverdiana"], ["142", "cilena"], ["120", "cinese"], ["128", "colombiana"], ["161", "croata"], ["139", "cubana"], ["129", "dominicana"], ["122", "ecuadoriana"], ["149", "egiziana"], ["152", "filippina"], ["116", "francese"], ["121", "giapponese"], ["140", "indiana"], ["133", "inglese"], ["115", "italiana"], ["210", "lettone"], ["150", "libanese"], ["209", "lituana"], ["148", "maldiviana"], ["131", "marocchina"], ["160", "messicana"], ["159", "moldava"], ["130", "nigeriana"], ["138", "olandese"], ["157", "pachistana"], ["141", "peruviana"], ["158", "polacca"], ["125", "portoghese"], ["135", "repubblica Ceca"], ["118", "rumena"], ["123", "russa"], ["136", "slovacca"], ["154", "slovena"], ["155", "somala"], ["117", "spagnola"], ["134", "statunitense"], ["124", "svedese"], ["137", "svizzera"], ["153", "tailandese"], ["223", "turca"], ["143", "ucraina"], ["132", "ungherese"], ["206", "uruguaiana"], ["144", "venezuelana"]]],
            ["22", "Seno naturale", [["170", "No"], ["169", "Si"]]]
        ],
        multiSelects: [
            ["12", "Lingue", [["55", "Bulgaro"], ["54", "Ceco"], ["56", "Cinese"], ["57", "Croato"], ["59", "Finlandese"], ["48", "Francese"], ["63", "Giapponese"], ["60", "Greco"], ["62", "Indiano"], ["47", "Inglese"], ["50", "Italiano"], ["64", "Lituano"], ["58", "Olandese"], ["65", "Polacco"], ["51", "Portoghese"], ["66", "Rumeno"], ["52", "Russo"], ["68", "Slovacco"], ["69", "Sloveno"], ["53", "Spagnolo"], ["221", "Tailandese"], ["49", "Tedesco"], ["67", "Turco"], ["61", "Ungherese"]]],
            ["16", "Tipologia", [["218", "Teen"], ["219", "Classica (25-35)"], ["167", "Milf (35-45)"], ["220", "Matura (oltre 45)"], ["113", "Mistress"], ["217", "Pornostar"], ["216", "Vip-lusso"]]]
        ],
        exclusiveMultiOptions: { "16": ["167", "218", "219", "220"] }
    };
});
