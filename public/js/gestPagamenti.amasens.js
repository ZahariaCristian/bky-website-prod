(() => {
    const STANDARD_SLOT_LABEL = "08:00-12:00 / 12:00-16:00 / 16:00-20:00";
    const SLOT_LABELS = {
        standard: STANDARD_SLOT_LABEL,
        "08-20": "08:00-20:00",
        "20-08": "20:00-08:00"
    };
    let priceRows = [];

    const getRoot = () => document.querySelector("#amasensPriceEditor");
    const getKey = (row = {}) => [
        `${row.platform || ""}`,
        `${row.product || ""}`,
        Number(row.days || 0),
        `${row.variantKey || "default"}`
    ].join("|");

    const getOptions = (row = {}) => {
        if (row.optionsJson && typeof row.optionsJson === "object") {
            return row.optionsJson;
        }
        try {
            return JSON.parse(row.optionsJson || "{}");
        } catch {
            return {};
        }
    };

    const formatInputPrice = (value) => Number(value || 0).toFixed(2);

    const appendTextCell = (row, value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    };

    const appendPriceInput = (row, priceRow) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.className = "form-control";
        input.min = "0";
        input.step = "0.01";
        input.value = formatInputPrice(priceRow.price);
        input.dataset.priceKey = getKey(priceRow);
        input.setAttribute("aria-label", "Prezzo");
        cell.appendChild(input);
        row.appendChild(cell);
    };

    const showEmptyRow = (body, columns, message) => {
        body.innerHTML = "";
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = columns;
        cell.className = "text-muted";
        cell.textContent = message;
        row.appendChild(cell);
        body.appendChild(row);
    };

    const renderTopList = () => {
        const body = document.querySelector("#amasensTopListEditorRows");
        const days = Number(document.querySelector("#amasensTopListDays")?.value || 1);
        if (!body) return;
        body.innerHTML = "";

        const rows = priceRows
            .filter((row) => row.product === "toplist" && Number(row.days) === days)
            .sort((a, b) => {
                const slotOrder = { standard: 0, "08-20": 1, "20-08": 2 };
                const aOptions = getOptions(a);
                const bOptions = getOptions(b);
                return (slotOrder[aOptions.timeSlot] - slotOrder[bOptions.timeSlot]) ||
                    (Number(aOptions.risalite) - Number(bOptions.risalite));
            });

        if (rows.length === 0) {
            showEmptyRow(body, 3, "Nessun prezzo TopList Amasens disponibile.");
            return;
        }

        rows.forEach((priceRow) => {
            const options = getOptions(priceRow);
            const row = document.createElement("tr");
            appendTextCell(row, SLOT_LABELS[options.timeSlot] || options.timeSlot);
            appendTextCell(
                row,
                `${options.risalite} ${Number(options.risalite) === 1 ? "risalita" : "risalite"}`
            );
            appendPriceInput(row, priceRow);
            body.appendChild(row);
        });
    };

    const showStatus = (message = "", type = "") => {
        const status = document.querySelector("#amasensPriceStatus");
        if (!status) return;
        status.className = "amasens-price-status";
        status.textContent = message;
        if (type) status.classList.add(`text-${type}`);
    };

    const loadPrices = async () => {
        showStatus("Caricamento listino...");
        try {
            const response = await fetch("/gestPagamenti/getAmasensPrices", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin"
            });
            if (response.status === 401) {
                window.location.href = "/";
                return;
            }
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile caricare il listino.");
            priceRows = Array.isArray(result.prices) ? result.prices : [];
            renderTopList();
            const button = document.querySelector("#saveAmasensPrices");
            if (button) button.disabled = false;
            showStatus("");
        } catch (error) {
            showStatus(error.message || "Impossibile caricare il listino.", "danger");
        }
    };

    const validatePrices = () => {
        for (const row of priceRows) {
            const price = Number(row.price);
            if (!Number.isFinite(price) || price < 0) {
                return "Il prezzo Amasens deve essere un numero valido.";
            }
        }
        return "";
    };

    const savePrices = async () => {
        const validationError = validatePrices();
        if (validationError) {
            showStatus(validationError, "danger");
            return;
        }

        const button = document.querySelector("#saveAmasensPrices");
        if (button) button.disabled = true;
        showStatus("Salvataggio...");

        try {
            const response = await fetch("/gestPagamenti/updateAmasensPrices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ rows: priceRows })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile salvare il listino.");
            priceRows = Array.isArray(result.prices) ? result.prices : priceRows;
            renderTopList();
            showStatus("Listino Amasens salvato.", "success");
        } catch (error) {
            showStatus(error.message || "Impossibile salvare il listino.", "danger");
        } finally {
            if (button) button.disabled = false;
        }
    };

    const initialize = () => {
        const root = getRoot();
        if (!root) return;

        root.addEventListener("input", (event) => {
            const input = event.target.closest("[data-price-key]");
            if (!input) return;
            const row = priceRows.find((item) => getKey(item) === input.dataset.priceKey);
            if (row) row.price = input.value;
            showStatus("");
        });

        root.querySelector("#amasensTopListDays")?.addEventListener("change", renderTopList);
        root.querySelector("#saveAmasensPrices")?.addEventListener("click", savePrices);

        loadPrices();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
