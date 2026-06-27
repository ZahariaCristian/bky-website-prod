(() => {
    const vetrinaPrices = {
        "1": [7, 13],
        "2": [13, 24],
        "3": [19, 35],
        "4": [25, 46],
        "5": [31, 57],
        "6": [38, 69],
        "7": [44, 80],
        "8": [50, 91],
        "9": [56, 102],
        "10": [63, 114],
        "11": [69, 125],
        "12": [75, 136],
        "13": [82, 149],
        "14": [87, 159],
        "15": [94, 170],
        "30": [182, 331]
    };

    const topListPrices = {
        "1": {
            standardSlots: { "1": [3, 6], "2": [5, 9], "3": [6, 11] },
            fullDay: [6, 11],
            night: [4, 7]
        },
        "3": {
            standardSlots: { "1": [9, 16], "2": [13, 24], "3": [17, 31] },
            fullDay: [17, 31],
            night: [10, 19]
        },
        "7": {
            standardSlots: { "1": [19, 34], "2": [30, 54], "3": [38, 69] },
            fullDay: [38, 69],
            night: [21, 38]
        },
        "14": {
            standardSlots: { "1": [34, 62], "2": [55, 100], "3": [72, 131] },
            fullDay: [72, 131],
            night: [34, 62]
        },
        "30": {
            standardSlots: { "1": [62, 113], "2": [100, 181], "3": [141, 256] },
            fullDay: [141, 256],
            night: [69, 125]
        }
    };

    const standardTopListSlots = new Set(["08-12", "12-16", "16-20"]);
    const standardTopListSlotLabel = "08:00-12:00 / 12:00-16:00 / 16:00-20:00";

    const toPrice = (values) => {
        if (!Array.isArray(values)) return null;
        return { discounted: Number(values[0]), standard: Number(values[1]) };
    };

    const formatPrice = (value) => `€ ${Number(value || 0).toFixed(2)}`;

    const getTopListPrice = (days, fascia, risalite) => {
        const prices = topListPrices[`${days}`];
        if (!prices) return null;
        if (standardTopListSlots.has(`${fascia}`)) {
            return toPrice(prices.standardSlots[`${risalite}`]);
        }
        if (`${fascia}` === "08-20") return toPrice(prices.fullDay);
        if (`${fascia}` === "20-08") return toPrice(prices.night);
        return null;
    };

    const getPanelPrice = (panel) => {
        const promoType = panel?.dataset?.promoType || "";
        if (promoType === "Vetrina") {
            return toPrice(vetrinaPrices[panel.querySelector(".vetrina-days-select")?.value || "1"]);
        }
        if (promoType === "TopList") {
            return getTopListPrice(
                panel.querySelector(".toplist-days-select")?.value || "1",
                panel.querySelector(".toplist-fascia-select")?.value || "08-12",
                panel.querySelector(".toplist-risalite-select")?.value || "1"
            );
        }
        return null;
    };

    const setPriceContent = (container, price) => {
        if (!container || !price) return;
        const discounted = container.querySelector(".incontriamoci-price-discounted");
        const standard = container.querySelector(".incontriamoci-price-standard");
        if (discounted) discounted.textContent = formatPrice(price.discounted);
        if (standard) standard.textContent = formatPrice(price.standard);
    };

    const createInlinePrice = (promoType) => {
        if (promoType !== "TopList" && promoType !== "Vetrina") return null;
        const price = document.createElement("div");
        price.className = "incontriamoci-inline-price";
        price.innerHTML = [
            "<span>Totale:</span>",
            '<strong class="incontriamoci-price-discounted">€ 0.00</strong>',
            '<del class="incontriamoci-price-standard">€ 0.00</del>'
        ].join(" ");
        return price;
    };

    const isDeletedSchedule = (panel) => {
        if (!panel || panel.style.display === "none") return true;
        return Boolean(window.jQuery && window.jQuery(panel).data("GCRecord"));
    };

    const updateAll = () => {
        let discountedTotal = 0;
        let standardTotal = 0;

        document.querySelectorAll(
            ".promoTopList .newpost-panel, .promoVetrina .newpost-panel"
        ).forEach((panel) => {
            const price = getPanelPrice(panel);
            setPriceContent(panel.querySelector(".incontriamoci-inline-price"), price);
            if (!price || isDeletedSchedule(panel)) return;
            discountedTotal += price.discounted;
            standardTotal += price.standard;
        });

        const discounted = document.querySelector("#totalCost");
        const standard = document.querySelector("#incontriamociStandardTotal");
        if (discounted) discounted.textContent = formatPrice(discountedTotal);
        if (standard) standard.textContent = formatPrice(standardTotal);
    };

    const appendTextCell = (row, value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    };

    const appendPriceCell = (row, values) => {
        const price = toPrice(values);
        const cell = document.createElement("td");
        const discounted = document.createElement("strong");
        const standard = document.createElement("del");
        discounted.textContent = formatPrice(price.discounted);
        standard.textContent = formatPrice(price.standard);
        standard.className = "incontriamoci-price-standard";
        cell.appendChild(discounted);
        cell.appendChild(document.createTextNode(" "));
        cell.appendChild(standard);
        row.appendChild(cell);
    };

    const renderVetrinaTable = () => {
        const body = document.querySelector("#incontriamociVetrinaPriceRows");
        if (!body) return;
        body.innerHTML = "";
        Object.entries(vetrinaPrices).forEach(([days, values]) => {
            const row = document.createElement("tr");
            appendTextCell(row, `${days} ${days === "1" ? "giorno" : "giorni"}`);
            appendPriceCell(row, values);
            body.appendChild(row);
        });
    };

    const renderTopListTable = () => {
        const body = document.querySelector("#incontriamociTopListPriceRows");
        if (!body) return;
        body.innerHTML = "";

        Object.entries(topListPrices).forEach(([days, prices]) => {
            Object.entries(prices.standardSlots).forEach(([risalite, values]) => {
                const row = document.createElement("tr");
                appendTextCell(row, `${days} ${days === "1" ? "giorno" : "giorni"}`);
                appendTextCell(row, standardTopListSlotLabel);
                appendTextCell(row, `${risalite} ${risalite === "1" ? "risalita" : "risalite"}`);
                appendPriceCell(row, values);
                body.appendChild(row);
            });

            [
                ["08:00-20:00", prices.fullDay],
                ["20:00-08:00", prices.night]
            ].forEach(([fascia, values]) => {
                const row = document.createElement("tr");
                appendTextCell(row, `${days} ${days === "1" ? "giorno" : "giorni"}`);
                appendTextCell(row, fascia);
                appendTextCell(row, "3 risalite");
                appendPriceCell(row, values);
                body.appendChild(row);
            });
        });
    };

    const selectPriceTable = (product) => {
        document.querySelectorAll("[data-incontriamoci-price-table]").forEach((button) => {
            const active = button.dataset.incontriamociPriceTable === product;
            button.classList.toggle("btn-primary", active);
            button.classList.toggle("btn-default", !active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        document.querySelectorAll(".incontriamoci-price-table").forEach((table) => {
            table.hidden = table.dataset.product !== product;
        });
    };

    const initialize = () => {
        renderTopListTable();
        renderVetrinaTable();
        selectPriceTable("toplist");

        document.querySelectorAll("[data-incontriamoci-price-table]").forEach((button) => {
            button.addEventListener("click", () => {
                selectPriceTable(button.dataset.incontriamociPriceTable);
            });
        });

        const toggle = document.querySelector("#toggleIncontriamociPriceList");
        const details = document.querySelector("#incontriamociPriceList");
        if (toggle && details) {
            toggle.addEventListener("click", () => {
                details.hidden = !details.hidden;
                toggle.setAttribute("aria-expanded", details.hidden ? "false" : "true");
                toggle.querySelector("span").textContent = details.hidden
                    ? "Mostra listino prezzi"
                    : "Nascondi listino prezzi";
                const icon = toggle.querySelector("i");
                if (icon) {
                    icon.classList.toggle("fa-chevron-down", details.hidden);
                    icon.classList.toggle("fa-chevron-up", !details.hidden);
                }
            });
        }

        updateAll();
    };

    window.IncontriamociPricing = {
        createInlinePrice,
        getPanelPrice,
        updateAll
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
