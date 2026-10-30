(() => {
    const EURO_PER_CREDIT = 0.33;
    let priceRows = [];

    const getKey = (row = {}) => [
        `${row.platform || "bakecaincontrii"}`.toLowerCase(),
        `${row.product || "top"}`.toLowerCase(),
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
        const status = document.querySelector("#bakecaincontriiPriceStatus");
        if (!status) return;
        status.className = "bakecaincontrii-price-status";
        status.textContent = message;
        if (type) status.classList.add(`text-${type}`);
    };

    const formatEuro = (credits, rate = EURO_PER_CREDIT) => {
        const value = Number(credits) * Number(rate || EURO_PER_CREDIT);
        return Number.isFinite(value) ? `€ ${value.toFixed(2)}` : "-";
    };

    const appendCreditInput = (tableRow, priceRow, field, label, optionField = false) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        const options = getOptions(priceRow);
        input.type = "number";
        input.className = "form-control";
        input.min = "0";
        input.step = "1";
        input.value = optionField ? Number(options[field] || 0) : Number(priceRow[field] || 0);
        input.dataset.priceKey = getKey(priceRow);
        input.dataset.priceField = field;
        input.dataset.optionField = optionField ? "true" : "false";
        input.setAttribute("aria-label", label);
        cell.appendChild(input);
        tableRow.appendChild(cell);
    };

    const render = () => {
        const body = document.querySelector("#bakecaincontriiPriceEditorRows");
        if (!body) return;
        body.innerHTML = "";

        priceRows.forEach((priceRow) => {
            const options = getOptions(priceRow);
            const row = document.createElement("tr");
            row.dataset.priceKey = getKey(priceRow);

            const label = document.createElement("td");
            label.textContent = options.label || priceRow.variantKey;
            row.appendChild(label);

            const days = document.createElement("td");
            days.textContent = Number(priceRow.days) === 1 ? "1 giorno" : `${priceRow.days} giorni`;
            row.appendChild(days);

            appendCreditInput(row, priceRow, "price", `Crediti Top base ${label.textContent}`);
            appendCreditInput(row, priceRow, "superTopCredits", `Crediti Super Top ${label.textContent}`, true);
            appendCreditInput(row, priceRow, "backgroundCredits", `Crediti sfondo ${label.textContent}`, true);
            appendCreditInput(row, priceRow, "labelCredits", `Crediti etichetta ${label.textContent}`, true);

            const euro = document.createElement("td");
            euro.className = "bakecaincontrii-base-euro";
            euro.textContent = formatEuro(priceRow.price, options.euroPerCredit);
            row.appendChild(euro);
            body.appendChild(row);
        });

        if (!priceRows.length) {
            body.innerHTML = '<tr><td colspan="7" class="text-muted">Nessuna combinazione Bakecaincontrii disponibile.</td></tr>';
        }
    };

    const mergeDefinitionsAndPrices = (definitions, prices) => {
        const savedByKey = new Map(prices.map((row) => [getKey(row), row]));
        return definitions.map((definition) => {
            const saved = savedByKey.get(getKey(definition));
            return {
                ...definition,
                ...(saved || {}),
                optionsJson: {
                    ...getOptions(definition),
                    ...getOptions(saved || {})
                },
                price: Number(saved ? saved.price : definition.price)
            };
        });
    };

    const loadPrices = async () => {
        showStatus("Caricamento listino...");
        try {
            const response = await fetch("/gestPagamenti/getBakecaincontriiPrices", {
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
            const button = document.querySelector("#saveBakecaincontriiPrices");
            if (button) button.disabled = false;
            showStatus("");
        } catch (error) {
            showStatus(error.message || "Impossibile caricare il listino.", "danger");
        }
    };

    const getConfiguredRows = () => priceRows.map((row) => {
        const options = getOptions(row);
        const values = [
            Number(row.price),
            Number(options.superTopCredits),
            Number(options.backgroundCredits),
            Number(options.labelCredits)
        ];
        if (values.some((value) => !Number.isInteger(value) || value < 0)) {
            throw new Error("Inserisci crediti interi e non negativi per tutte le combinazioni.");
        }
        return {
            ...row,
            price: values[0],
            optionsJson: {
                ...options,
                superTopCredits: values[1],
                backgroundCredits: values[2],
                labelCredits: values[3]
            }
        };
    });

    const savePrices = async () => {
        let rows;
        try {
            rows = getConfiguredRows();
        } catch (error) {
            showStatus(error.message, "danger");
            return;
        }

        const button = document.querySelector("#saveBakecaincontriiPrices");
        if (button) button.disabled = true;
        showStatus("Salvataggio...");
        try {
            const response = await fetch("/gestPagamenti/updateBakecaincontriiPrices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ rows })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile salvare il listino.");
            priceRows = mergeDefinitionsAndPrices(
                Array.isArray(result.definitions) ? result.definitions : priceRows,
                Array.isArray(result.prices) ? result.prices : rows
            );
            render();
            showStatus("Listino Bakecaincontrii salvato.", "success");
        } catch (error) {
            showStatus(error.message || "Impossibile salvare il listino.", "danger");
        } finally {
            if (button) button.disabled = false;
        }
    };

    const initialize = () => {
        const root = document.querySelector("#bakecaincontriiPriceEditor");
        if (!root) return;

        root.addEventListener("input", (event) => {
            const input = event.target.closest("[data-price-key][data-price-field]");
            if (!input) return;
            const row = priceRows.find((item) => getKey(item) === input.dataset.priceKey);
            if (!row) return;
            if (input.dataset.optionField === "true") {
                row.optionsJson = {
                    ...getOptions(row),
                    [input.dataset.priceField]: input.value
                };
            } else {
                row[input.dataset.priceField] = input.value;
                const euro = input.closest("tr")?.querySelector(".bakecaincontrii-base-euro");
                if (euro) euro.textContent = formatEuro(input.value, getOptions(row).euroPerCredit);
            }
            showStatus("");
        });
        root.querySelector("#saveBakecaincontriiPrices")?.addEventListener("click", savePrices);
        loadPrices();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
