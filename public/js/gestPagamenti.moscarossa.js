(() => {
    const ADDON_PRODUCTS = new Set(["vetrina", "diamond"]);
    let priceRows = [];
    let selectedProduct = "premium";

    const getKey = (row = {}) => [
        `${row.platform || ""}`,
        `${row.product || ""}`,
        Number(row.days || 0),
        `${row.variantKey || "default"}`
    ].join("|");

    const showStatus = (message = "", type = "") => {
        const status = document.querySelector("#moscarossaPriceStatus");
        if (!status) return;
        status.className = "moscarossa-price-status";
        status.textContent = message;
        if (type) status.classList.add(`text-${type}`);
    };

    const render = () => {
        const body = document.querySelector("#moscarossaPriceEditorRows");
        const durationHeading = document.querySelector("#moscarossaPriceDurationHeading");
        if (!body) return;
        body.innerHTML = "";

        const isAddon = ADDON_PRODUCTS.has(selectedProduct);
        if (durationHeading) durationHeading.textContent = isAddon ? "Tariffazione" : "Durata";
        const rows = priceRows
            .filter((row) => row.product === selectedProduct)
            .sort((left, right) => Number(left.days) - Number(right.days));

        rows.forEach((priceRow) => {
            const row = document.createElement("tr");
            const duration = document.createElement("td");
            duration.textContent = isAddon
                ? "Per giorno"
                : `${priceRow.days} ${Number(priceRow.days) === 1 ? "giorno" : "giorni"}`;

            const priceCell = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number";
            input.className = "form-control";
            input.min = "0";
            input.step = "0.01";
            input.value = Number(priceRow.price || 0).toFixed(2);
            input.dataset.priceKey = getKey(priceRow);
            input.setAttribute("aria-label", `Prezzo ${selectedProduct}`);
            priceCell.appendChild(input);

            row.appendChild(duration);
            row.appendChild(priceCell);
            body.appendChild(row);
        });

        if (rows.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 2;
            cell.className = "text-muted";
            cell.textContent = "Nessun prezzo Moscarossa disponibile.";
            row.appendChild(cell);
            body.appendChild(row);
        }
    };

    const selectProduct = (product) => {
        selectedProduct = product;
        document.querySelectorAll("[data-moscarossa-editor-product]").forEach((button) => {
            const active = button.dataset.moscarossaEditorProduct === product;
            button.classList.toggle("btn-primary", active);
            button.classList.toggle("btn-default", !active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        render();
    };

    const loadPrices = async () => {
        showStatus("Caricamento listino...");
        try {
            const response = await fetch("/gestPagamenti/getMoscarossaPrices", {
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
            render();
            const button = document.querySelector("#saveMoscarossaPrices");
            if (button) button.disabled = false;
            showStatus("");
        } catch (error) {
            showStatus(error.message || "Impossibile caricare il listino.", "danger");
        }
    };

    const savePrices = async () => {
        const invalid = priceRows.some((row) => {
            const price = Number(row.price);
            return !Number.isFinite(price) || price < 0;
        });
        if (invalid) {
            showStatus("Inserisci un prezzo Moscarossa valido.", "danger");
            return;
        }

        const button = document.querySelector("#saveMoscarossaPrices");
        if (button) button.disabled = true;
        showStatus("Salvataggio...");

        try {
            const response = await fetch("/gestPagamenti/updateMoscarossaPrices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ rows: priceRows })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile salvare il listino.");
            priceRows = Array.isArray(result.prices) ? result.prices : priceRows;
            render();
            showStatus("Listino Moscarossa salvato.", "success");
        } catch (error) {
            showStatus(error.message || "Impossibile salvare il listino.", "danger");
        } finally {
            if (button) button.disabled = false;
        }
    };

    const initialize = () => {
        const root = document.querySelector("#moscarossaPriceEditor");
        if (!root) return;

        root.addEventListener("input", (event) => {
            const input = event.target.closest("[data-price-key]");
            if (!input) return;
            const row = priceRows.find((item) => getKey(item) === input.dataset.priceKey);
            if (row) row.price = input.value;
            showStatus("");
        });
        root.querySelectorAll("[data-moscarossa-editor-product]").forEach((button) => {
            button.addEventListener("click", () => {
                selectProduct(button.dataset.moscarossaEditorProduct);
            });
        });
        root.querySelector("#saveMoscarossaPrices")?.addEventListener("click", savePrices);

        selectProduct(selectedProduct);
        loadPrices();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
