(() => {
    const STANDARD_SLOT_LABEL = "08:00-12:00 / 12:00-16:00 / 16:00-20:00";
    const SLOT_LABELS = {
        standard: STANDARD_SLOT_LABEL,
        "08-20": "08:00-20:00",
        "20-08": "20:00-08:00"
    };
    let priceRows = [];

    const getRoot = () => document.querySelector("#incontriamociPriceEditor");
    const getKey = (row = {}) => [
        `${row.product || ""}`,
        Number(row.days || 0),
        `${row.timeSlot || ""}`,
        Number(row.risalite || 0)
    ].join("|");

    const formatInputPrice = (value) => Number(value || 0).toFixed(2);

    const appendTextCell = (row, value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
    };

    const appendPriceInput = (row, priceRow, field, label) => {
        const cell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.className = "form-control";
        input.min = "0";
        input.step = "0.01";
        input.value = formatInputPrice(priceRow[field]);
        input.dataset.priceKey = getKey(priceRow);
        input.dataset.priceField = field;
        input.setAttribute("aria-label", label);
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
        const body = document.querySelector("#incontriamociTopListEditorRows");
        const days = Number(document.querySelector("#incontriamociTopListDays")?.value || 1);
        if (!body) return;
        body.innerHTML = "";

        const rows = priceRows
            .filter((row) => row.product === "toplist" && Number(row.days) === days)
            .sort((a, b) => {
                const slotOrder = { standard: 0, "08-20": 1, "20-08": 2 };
                return (slotOrder[a.timeSlot] - slotOrder[b.timeSlot]) ||
                    (Number(a.risalite) - Number(b.risalite));
            });

        if (rows.length === 0) {
            showEmptyRow(body, 4, "Nessun prezzo TopList disponibile.");
            return;
        }

        rows.forEach((priceRow) => {
            const row = document.createElement("tr");
            appendTextCell(row, SLOT_LABELS[priceRow.timeSlot] || priceRow.timeSlot);
            appendTextCell(
                row,
                `${priceRow.risalite} ${Number(priceRow.risalite) === 1 ? "risalita" : "risalite"}`
            );
            appendPriceInput(row, priceRow, "discountedPrice", "Prezzo");
            appendPriceInput(row, priceRow, "standardPrice", "Prezzo standard");
            body.appendChild(row);
        });
    };

    const renderVetrina = () => {
        const body = document.querySelector("#incontriamociVetrinaEditorRows");
        if (!body) return;
        body.innerHTML = "";

        const rows = priceRows
            .filter((row) => row.product === "vetrina")
            .sort((a, b) => Number(a.days) - Number(b.days));

        if (rows.length === 0) {
            showEmptyRow(body, 3, "Nessun prezzo Top Vetrina disponibile.");
            return;
        }

        rows.forEach((priceRow) => {
            const row = document.createElement("tr");
            appendTextCell(
                row,
                `${priceRow.days} ${Number(priceRow.days) === 1 ? "giorno" : "giorni"}`
            );
            appendPriceInput(row, priceRow, "discountedPrice", "Prezzo");
            appendPriceInput(row, priceRow, "standardPrice", "Prezzo standard");
            body.appendChild(row);
        });
    };

    const render = () => {
        renderTopList();
        renderVetrina();
    };

    const showStatus = (message = "", type = "") => {
        const status = document.querySelector("#incontriamociPriceStatus");
        if (!status) return;
        status.className = "incontriamoci-price-status";
        status.textContent = message;
        if (type) status.classList.add(`text-${type}`);
    };

    const selectProduct = (product) => {
        document.querySelectorAll("[data-incontriamoci-editor-product]").forEach((button) => {
            const active = button.dataset.incontriamociEditorProduct === product;
            button.classList.toggle("btn-primary", active);
            button.classList.toggle("btn-default", !active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        document.querySelectorAll("[data-incontriamoci-editor-table]").forEach((table) => {
            table.hidden = table.dataset.incontriamociEditorTable !== product;
        });
        const daysControl = document.querySelector("#incontriamociTopListDaysControl");
        if (daysControl) daysControl.hidden = product !== "toplist";
    };

    const loadPrices = async () => {
        showStatus("Caricamento listino...");
        try {
            const response = await fetch("/gestPagamenti/getIncontriamociPrices", {
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
            const button = document.querySelector("#saveIncontriamociPrices");
            if (button) button.disabled = false;
            showStatus("");
        } catch (error) {
            showStatus(error.message || "Impossibile caricare il listino.", "danger");
        }
    };

    const validatePrices = () => {
        for (const row of priceRows) {
            const discountedPrice = Number(row.discountedPrice);
            const standardPrice = Number(row.standardPrice);
            if (
                !Number.isFinite(discountedPrice) ||
                !Number.isFinite(standardPrice) ||
                discountedPrice < 0 ||
                standardPrice < discountedPrice
            ) {
                return "Il prezzo standard non può essere inferiore al prezzo.";
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

        const button = document.querySelector("#saveIncontriamociPrices");
        if (button) button.disabled = true;
        showStatus("Salvataggio...");

        try {
            const response = await fetch("/gestPagamenti/updateIncontriamociPrices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ rows: priceRows })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Impossibile salvare il listino.");
            priceRows = Array.isArray(result.prices) ? result.prices : priceRows;
            render();
            showStatus("Listino Incontriamoci salvato.", "success");
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
            const input = event.target.closest("[data-price-key][data-price-field]");
            if (!input) return;
            const row = priceRows.find((item) => getKey(item) === input.dataset.priceKey);
            if (row) row[input.dataset.priceField] = input.value;
            showStatus("");
        });

        root.querySelectorAll("[data-incontriamoci-editor-product]").forEach((button) => {
            button.addEventListener("click", () => {
                selectProduct(button.dataset.incontriamociEditorProduct);
            });
        });
        root.querySelector("#incontriamociTopListDays")?.addEventListener("change", renderTopList);
        root.querySelector("#saveIncontriamociPrices")?.addEventListener("click", savePrices);

        selectProduct("toplist");
        loadPrices();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
