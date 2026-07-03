(() => {
    let priceRows = [];
    let selectedProduct = "toplist1";

    const getKey = (row = {}) => [
        `${row.platform || ""}`,
        `${row.product || ""}`,
        Number(row.days || 0),
        `${row.variantKey || "default"}`
    ].join("|");

    const showStatus = (message = "", type = "") => {
        const status = document.querySelector("#bakecaPriceStatus");
        if (!status) return;
        status.className = "bakeca-price-status";
        status.textContent = message;
        if (type) status.classList.add(`text-${type}`);
    };

    const render = () => {
        const body = document.querySelector("#bakecaPriceEditorRows");
        if (!body) return;
        body.innerHTML = "";

        const rows = priceRows
            .filter((row) => row.product === selectedProduct)
            .sort((a, b) => Number(a.days) - Number(b.days));

        rows.forEach((priceRow) => {
            const settings = window.BakecaPriceCatalog?.getSettings(
                priceRow.product,
                priceRow.days
            );
            const row = document.createElement("tr");

            const duration = document.createElement("td");
            duration.textContent = window.BakecaPriceCatalog?.durationLabel(priceRow.days);

            const credits = document.createElement("td");
            credits.textContent = `${settings?.credits || 0} crediti`;

            const priceCell = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number";
            input.className = "form-control";
            input.min = "0";
            input.step = "0.01";
            input.value = Number(priceRow.price || 0).toFixed(2);
            input.dataset.priceKey = getKey(priceRow);
            input.setAttribute("aria-label", "Prezzo");
            priceCell.appendChild(input);

            row.appendChild(duration);
            row.appendChild(credits);
            row.appendChild(priceCell);
            body.appendChild(row);
        });

        if (rows.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 3;
            cell.className = "text-muted";
            cell.textContent = "Nessun prezzo Bakeca.it disponibile.";
            row.appendChild(cell);
            body.appendChild(row);
        }
    };

    const selectProduct = (product) => {
        selectedProduct = product;
        document.querySelectorAll("[data-bakeca-editor-product]").forEach((button) => {
            const active = button.dataset.bakecaEditorProduct === product;
            button.classList.toggle("btn-primary", active);
            button.classList.toggle("btn-default", !active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        render();
    };

    const loadPrices = async () => {
        showStatus("Caricamento listino...");
        try {
            const response = await fetch("/gestPagamenti/getBakecaPrices", {
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
            const button = document.querySelector("#saveBakecaPrices");
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
            showStatus("Inserisci un prezzo valido.", "danger");
            return;
        }

        const button = document.querySelector("#saveBakecaPrices");
        if (button) button.disabled = true;
        showStatus("Salvataggio...");

        try {
            const response = await fetch("/gestPagamenti/updateBakecaPrices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ rows: priceRows })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile salvare il listino.");
            priceRows = Array.isArray(result.prices) ? result.prices : priceRows;
            render();
            showStatus("Listino Bakeca.it salvato.", "success");
        } catch (error) {
            showStatus(error.message || "Impossibile salvare il listino.", "danger");
        } finally {
            if (button) button.disabled = false;
        }
    };

    const initialize = () => {
        const root = document.querySelector("#bakecaPriceEditor");
        if (!root) return;

        root.addEventListener("input", (event) => {
            const input = event.target.closest("[data-price-key]");
            if (!input) return;
            const row = priceRows.find((item) => getKey(item) === input.dataset.priceKey);
            if (row) row.price = input.value;
            showStatus("");
        });
        root.querySelectorAll("[data-bakeca-editor-product]").forEach((button) => {
            button.addEventListener("click", () => {
                selectProduct(button.dataset.bakecaEditorProduct);
            });
        });
        root.querySelector("#saveBakecaPrices")?.addEventListener("click", savePrices);

        selectProduct(selectedProduct);
        loadPrices();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
