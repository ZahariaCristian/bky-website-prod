(() => {
    let priceRows = [];
    let selectedProduct = "top";

    const getKey = (row = {}) => [
        `${row.platform || ""}`.toLowerCase(),
        `${row.product || ""}`.toLowerCase(),
        Number(row.days || 0),
        `${row.variantKey || "default"}`
    ].join("|");

    const getOptions = (row = {}) => {
        if (row.optionsJson && typeof row.optionsJson === "object") return row.optionsJson;
        try {
            return JSON.parse(row.optionsJson || "{}");
        } catch {
            return {};
        }
    };

    const showStatus = (message = "", type = "") => {
        const status = document.querySelector("#trovagnoccaPriceStatus");
        if (!status) return;
        status.className = "trovagnocca-price-status";
        status.textContent = message;
        if (type) status.classList.add(`text-${type}`);
    };

    const appendPriceInput = (row, priceRow, field, label) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.className = "form-control";
        input.min = "0";
        input.step = "0.01";
        input.value = priceRow[field] === null || priceRow[field] === undefined
            ? ""
            : Number(priceRow[field]).toFixed(2);
        input.placeholder = "0.00";
        input.dataset.priceKey = getKey(priceRow);
        input.dataset.priceField = field;
        input.setAttribute("aria-label", label);
        cell.appendChild(input);
        row.appendChild(cell);
    };

    const render = () => {
        const body = document.querySelector("#trovagnoccaPriceEditorRows");
        if (!body) return;
        body.innerHTML = "";

        const days = Number(document.querySelector("#trovagnoccaTopDays")?.value || 1);
        const rows = priceRows
            .filter((item) => item.product === selectedProduct)
            .filter((item) => selectedProduct !== "top" || Number(item.days) === days)
            .sort((left, right) =>
                Number(getOptions(left).timeSlotId) - Number(getOptions(right).timeSlotId)
            );

        rows.forEach((priceRow) => {
            const options = getOptions(priceRow);
            const row = document.createElement("tr");
            const label = document.createElement("td");
            label.textContent = options.label || priceRow.variantKey;
            row.appendChild(label);
            appendPriceInput(row, priceRow, "price", `Prezzo ${label.textContent}`);
            appendPriceInput(row, priceRow, "standardPrice", `Prezzo standard ${label.textContent}`);
            body.appendChild(row);
        });

        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="3" class="text-muted">Nessuna combinazione Trovagnocca disponibile.</td></tr>';
        }
    };

    const mergeDefinitionsAndPrices = (definitions, prices) => {
        const savedByKey = new Map(prices.map((row) => [getKey(row), row]));
        return definitions.map((definition) => {
            const saved = savedByKey.get(getKey(definition));
            return {
                ...definition,
                ...(saved || {}),
                optionsJson: getOptions(saved || definition),
                price: saved ? saved.price : null,
                standardPrice: saved ? saved.standardPrice : null
            };
        });
    };

    const selectProduct = (product) => {
        selectedProduct = product;
        document.querySelectorAll("[data-trovagnocca-editor-product]").forEach((button) => {
            const active = button.dataset.trovagnoccaEditorProduct === product;
            button.classList.toggle("btn-primary", active);
            button.classList.toggle("btn-default", !active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        const daysControl = document.querySelector("#trovagnoccaTopDaysControl");
        if (daysControl) daysControl.hidden = product !== "top";
        render();
    };

    const loadPrices = async () => {
        showStatus("Caricamento listino...");
        try {
            const response = await fetch("/gestPagamenti/getTrovagnoccaPrices", {
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
            priceRows = mergeDefinitionsAndPrices(
                Array.isArray(result.definitions) ? result.definitions : [],
                Array.isArray(result.prices) ? result.prices : []
            );
            render();
            const button = document.querySelector("#saveTrovagnoccaPrices");
            if (button) button.disabled = false;
            showStatus("");
        } catch (error) {
            showStatus(error.message || "Impossibile caricare il listino.", "danger");
        }
    };

    const getConfiguredRows = () => {
        const rows = [];
        for (const row of priceRows) {
            const hasPrice = `${row.price ?? ""}`.trim() !== "";
            const hasStandardPrice = `${row.standardPrice ?? ""}`.trim() !== "";
            if (!hasPrice && !hasStandardPrice) continue;
            if (!hasPrice || !hasStandardPrice) {
                throw new Error("Compila sia il prezzo sia il prezzo standard per ogni fascia configurata.");
            }
            const price = Number(row.price);
            const standardPrice = Number(row.standardPrice);
            if (!Number.isFinite(price) || !Number.isFinite(standardPrice) || price < 0) {
                throw new Error("Inserisci prezzi Trovagnocca validi.");
            }
            if (standardPrice < price) {
                throw new Error("Il prezzo standard non può essere inferiore al prezzo.");
            }
            rows.push({ ...row, price, standardPrice });
        }
        if (!rows.length) throw new Error("Configura almeno una fascia Trovagnocca.");
        return rows;
    };

    const savePrices = async () => {
        let configuredRows;
        try {
            configuredRows = getConfiguredRows();
        } catch (error) {
            showStatus(error.message, "danger");
            return;
        }

        const button = document.querySelector("#saveTrovagnoccaPrices");
        if (button) button.disabled = true;
        showStatus("Salvataggio...");
        try {
            const response = await fetch("/gestPagamenti/updateTrovagnoccaPrices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ rows: configuredRows })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile salvare il listino.");
            priceRows = mergeDefinitionsAndPrices(
                Array.isArray(result.definitions) ? result.definitions : priceRows,
                Array.isArray(result.prices) ? result.prices : configuredRows
            );
            render();
            showStatus("Listino Trovagnocca salvato.", "success");
        } catch (error) {
            showStatus(error.message || "Impossibile salvare il listino.", "danger");
        } finally {
            if (button) button.disabled = false;
        }
    };

    const initialize = () => {
        const root = document.querySelector("#trovagnoccaPriceEditor");
        if (!root) return;

        root.addEventListener("input", (event) => {
            const input = event.target.closest("[data-price-key][data-price-field]");
            if (!input) return;
            const row = priceRows.find((item) => getKey(item) === input.dataset.priceKey);
            if (row) row[input.dataset.priceField] = input.value;
            showStatus("");
        });
        root.querySelectorAll("[data-trovagnocca-editor-product]").forEach((button) => {
            button.addEventListener("click", () => selectProduct(button.dataset.trovagnoccaEditorProduct));
        });
        root.querySelector("#trovagnoccaTopDays")?.addEventListener("change", render);
        root.querySelector("#saveTrovagnoccaPrices")?.addEventListener("click", savePrices);

        selectProduct(selectedProduct);
        loadPrices();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
