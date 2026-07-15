(function () {
    const cityOptions = [
        ["agrigento", "Agrigento", "10835"],
        ["alessandria", "Alessandria", "10827"],
        ["ancona", "Ancona", "10820"],
        ["aosta", "Aosta", "10859"],
        ["arezzo", "Arezzo", "10845"],
        ["ascoli piceno", "Ascoli Piceno", "10821"],
        ["asti", "Asti", "10828"],
        ["avellino", "Avellino", "10773"],
        ["bari", "Bari", "10760"],
        ["barletta andria trani", "Barletta-Andria-Trani", "10761"],
        ["belluno", "Belluno", "10860"],
        ["benevento", "Benevento", "10774"],
        ["bergamo", "Bergamo", "10808"],
        ["biella", "Biella", "10829"],
        ["bologna", "Bologna", "10787"],
        ["bolzano", "Bolzano", "10855"],
        ["brescia", "Brescia", "10809"],
        ["brindisi", "Brindisi", "10762"],
        ["cagliari", "Cagliari", "10779"],
        ["caltanissetta", "Caltanissetta", "10836"],
        ["campobasso", "Campobasso", "10825"],
        ["carbonia iglesias", "Carbonia-Iglesias", "10780"],
        ["caserta", "Caserta", "10775"],
        ["catania", "Catania", "10837"],
        ["catanzaro", "Catanzaro", "10768"],
        ["chieti", "Chieti", "22289"],
        ["como", "Como", "10810"],
        ["cosenza", "Cosenza", "10769"],
        ["cremona", "Cremona", "10811"],
        ["crotone", "Crotone", "10770"],
        ["cuneo", "Cuneo", "10830"],
        ["enna", "Enna", "10838"],
        ["fermo", "Fermo", "10822"],
        ["ferrara", "Ferrara", "10788"],
        ["firenze", "Firenze", "10846"],
        ["foggia", "Foggia", "10763"],
        ["forli", "Forli", "10789"],
        ["frosinone", "Frosinone", "10800"],
        ["genova", "Genova", "10804"],
        ["gorizia", "Gorizia", "10796"],
        ["grosseto", "Grosseto", "10847"],
        ["imperia", "Imperia", "10805"],
        ["isernia", "Isernia", "10826"],
        ["l'aquila", "L'Aquila", "10757"],
        ["la spezia", "La Spezia", "10806"],
        ["latina", "Latina", "10801"],
        ["lecce", "Lecce", "10764"],
        ["lecco", "Lecco", "10812"],
        ["livorno", "Livorno", "10848"],
        ["lodi", "Lodi", "10813"],
        ["lucca", "Lucca", "10849"],
        ["macerata", "Macerata", "10823"],
        ["mantova", "Mantova", "10814"],
        ["massa carrara", "Massa-Carrara", "10850"],
        ["matera", "Matera", "10766"],
        ["medio campidano", "Medio Campidano", "10781"],
        ["messina", "Messina", "10839"],
        ["milano", "Milano", "10815"],
        ["modena", "Modena", "10790"],
        ["monza", "Monza", "10816"],
        ["napoli", "Napoli", "10778"],
        ["novara", "Novara", "10831"],
        ["nuoro", "Nuoro", "10782"],
        ["ogliastra", "Ogliastra", "10783"],
        ["olbia tempio", "Olbia-Tempio", "10784"],
        ["oristano", "Oristano", "10785"],
        ["padova", "Padova", "10861"],
        ["palermo", "Palermo", "10840"],
        ["parma", "Parma", "10791"],
        ["pavia", "Pavia", "10817"],
        ["perugia", "Perugia", "10857"],
        ["pesaro urbino", "Pesaro-Urbino", "10824"],
        ["pescara", "Pescara", "10758"],
        ["piacenza", "Piacenza", "10792"],
        ["pisa", "Pisa", "10851"],
        ["pistoia", "Pistoia", "10852"],
        ["pordenone", "Pordenone", "10797"],
        ["potenza", "Potenza", "10767"],
        ["prato", "Prato", "10853"],
        ["ragusa", "Ragusa", "10841"],
        ["ravenna", "Ravenna", "10793"],
        ["reggio calabria", "Reggio Calabria", "10771"],
        ["reggio emilia", "Reggio Emilia", "10794"],
        ["rieti", "Rieti", "10802"],
        ["rimini", "Rimini", "10795"],
        ["roma", "Roma", "22290"],
        ["rovigo", "Rovigo", "10862"],
        ["salerno", "Salerno", "10777"],
        ["sassari", "Sassari", "10786"],
        ["savona", "Savona", "10807"],
        ["siena", "Siena", "10854"],
        ["siracusa", "Siracusa", "10842"],
        ["sondrio", "Sondrio", "10818"],
        ["taranto", "Taranto", "10765"],
        ["teramo", "Teramo", "10759"],
        ["terni", "Terni", "10858"],
        ["torino", "Torino", "10832"],
        ["trapani", "Trapani", "10843"],
        ["trento", "Trento", "10856"],
        ["treviso", "Treviso", "10863"],
        ["trieste", "Trieste", "10798"],
        ["udine", "Udine", "10799"],
        ["varese", "Varese", "10819"],
        ["venezia", "Venezia", "10864"],
        ["verbano cusio ossola", "Verbano-Cusio-Ossola", "10833"],
        ["vercelli", "Vercelli", "10834"],
        ["verona", "Verona", "10865"],
        ["vibo valentia", "Vibo Valentia", "10772"],
        ["vicenza", "Vicenza", "10866"],
        ["viterbo", "Viterbo", "10803"]
    ];

    const categoryValues = {
        DONNAUOMO: "101",
        UOMOUOMO: "98",
        TRANS: "104",
        COPPIE: "103"
    };

    const filterValues = {
        ethnicity: {
            Italiana: "1",
            Africana: "2",
            Indiana: "3",
            Orientale: "4",
            Araba: "5",
            Latina: "6",
            Caucasica: "7"
        },
        eye: {
            Neri: "97",
            Blue: "98",
            Verdi: "99",
            Marroni: "100",
            Ambra: "101",
            Grigi: "102",
            Nocciola: "103"
        },
        hair: {
            Biondi: "104",
            Castani: "105",
            Neri: "106",
            Rossi: "107",
            Bianchi: "108",
            Grigi: "109"
        },
        body: {
            Magro: "110",
            Atletico: "111",
            Formoso: "112"
        },
        particularSigns: {
            Fumatrice: "125",
            Tatuaggi: "126",
            Piercing: "127",
            Depilata: "128",
            "Seno Rifatto": "129",
            "Labbra Rifatte": "130"
        },
        services: {
            Orale: "131",
            Anale: "132",
            Sadomaso: "133",
            "Esperienza fidanzata": "134",
            "Attrici porno": "135",
            "Eiaculazione sul corpo": "136",
            "Massaggio erotico": "137",
            "Massaggio tantrico": "138",
            Fetish: "139",
            "Bacio alla francese": "140",
            "Gioco di ruolo": "141",
            Trio: "142",
            Sexting: "143",
            "Video chiamata": "144",
            "Strap On": "145",
            Mistress: "146"
        },
        serviceFor: {
            Uomini: "147",
            Donne: "148",
            Coppie: "149",
            Disabili: "150"
        },
        servicePlace: {
            "Visita a domicilio": "151",
            "Eventi e feste": "152",
            "Albergo / motel": "153",
            "A casa": "154",
            Clubs: "155"
        },
        paymentMethods: {
            "Carta di credito": "156",
            Contanti: "157"
        }
    };

    const nationalityValues = {
        nationality_albanian: "8",
        nationality_american: "9",
        nationality_arabic: "10",
        nationality_argentinian: "11",
        nationality_australian: "12",
        nationality_austrian: "13",
        nationality_bangladeshi: "14",
        nationality_belgian: "15",
        nationality_bolivian: "16",
        nationality_bosnian: "17",
        nationality_brazilian: "18",
        nationality_bulgarian: "19",
        nationality_canadian: "20",
        nationality_czech: "21",
        nationality_chilean: "22",
        nationality_chinese: "23",
        nationality_colombian: "24",
        nationality_costa_rican: "25",
        nationality_croatian: "26",
        nationality_cuban: "27",
        nationality_danish: "28",
        nationality_dominican: "29",
        nationality_ecuadorian: "30",
        nationality_estonian: "31",
        nationality_filipino: "32",
        nationality_finnish: "33",
        nationality_french: "34",
        nationality_jamaican: "35",
        nationality_japanese: "36",
        nationality_greek: "37",
        nationality_guatemalan: "38",
        nationality_haitian: "39",
        nationality_honduran: "40",
        nationality_indian: "41",
        nationality_indonesian: "42",
        nationality_english: "43",
        nationality_irish: "44",
        nationality_italian: "45",
        nationality_kenyan: "46",
        nationality_latvian: "47",
        nationality_lithuanian: "48",
        nationality_maldivian: "49",
        nationality_malaysian: "50",
        nationality_moroccan: "51",
        nationality_mexican: "52",
        nationality_moldovan: "53",
        nationality_new_zealander: "54",
        nationality_nicaraguan: "55",
        nationality_nigerian: "56",
        nationality_norwegian: "57",
        nationality_dutch: "58",
        nationality_pakistani: "59",
        nationality_panamanian: "60",
        nationality_paraguayan: "61",
        nationality_peruvian: "62",
        nationality_polish: "63",
        nationality_portuguese: "64",
        nationality_romanian: "65",
        nationality_russian: "66",
        nationality_senegalese: "67",
        nationality_serbian: "68",
        nationality_singaporean: "69",
        nationality_spanish: "70",
        nationality_south_african: "71",
        nationality_swedish: "72",
        nationality_swiss: "73",
        nationality_thai: "74",
        nationality_german: "75",
        nationality_tunisian: "76",
        nationality_turkish: "77",
        nationality_ukrainian: "78",
        nationality_hungarian: "79",
        nationality_uruguayan: "80",
        nationality_venezuelan: "81",
        nationality_vietnamese: "82"
    };

    const normalizeCityKey = (value) => `${value || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const cityValues = {};
    cityOptions.forEach(([key, label, id]) => {
        cityValues[key] = id;
        cityValues[normalizeCityKey(label)] = id;
    });

    const aliases = {
        alessandria: "10827",
        ascoli: "10821",
        barletta: "10761",
        "carbonia-iglesias": "10780",
        "forli cesena": "10789",
        "forli'": "10789",
        "l aquila": "10757",
        "massa-carrara": "10850",
        "olbia-tempio": "10784",
        urbino: "10824",
        verbania: "10833"
    };

    Object.assign(cityValues, aliases);

    const populateIncontriamociCitySelect = (root) => {
        const scope = root || document;
        scope.querySelectorAll("select[data-incontriamoci-cities='true']").forEach((select) => {
            const selected = normalizeCityKey(select.value);
            select.innerHTML = cityOptions
                .map(([, label, id]) => `<option value="${label}" data-city-id="${id}">${label}</option>`)
                .join("");

            const match = cityOptions.find(([key, label]) => key === selected || normalizeCityKey(label) === selected);
            if (match) {
                select.value = match[1];
            }
        });
    };

    window.INCONTRIAMOCI_CITY_OPTIONS = cityOptions.map(([key, label, id]) => ({ key, label, id }));
    window.INCONTRIAMOCI_CITY_VALUES = cityValues;
    window.INCONTRIAMOCI_CATEGORY_VALUES = categoryValues;
    window.INCONTRIAMOCI_FILTER_VALUES = filterValues;
    window.INCONTRIAMOCI_NATIONALITY_VALUES = nationalityValues;
    window.normalizeIncontriamociCityKey = normalizeCityKey;
    window.populateIncontriamociCitySelects = populateIncontriamociCitySelect;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => populateIncontriamociCitySelect(document));
    } else {
        populateIncontriamociCitySelect(document);
    }
})();
