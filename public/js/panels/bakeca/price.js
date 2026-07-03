(() => {
    const storedPrices = new Map();

    const getKey = (product, days) => `${product}|${Number(days || 0)}`;
    const formatPrice = (value) => `€ ${Number(value || 0).toFixed(2)}`;

    const getScheduleProduct = (panel) => {
        if (panel?.closest(".promo1x")) return "toplist1";
        if (panel?.closest(".promo3x")) return "toplist3";
        return "";
    };

    const getSchedulePrice = (panel) => {
        const product = getScheduleProduct(panel);
        if (!product) return null;
        const days = Number(
            panel.querySelector("select")?.value ||
            panel.dataset.duration ||
            1
        );
        const settings = window.BakecaPriceCatalog?.getSettings(product, days);
        if (!settings) return null;

        return {
            product,
            days,
            credits: Number(settings.credits),
            price: storedPrices.get(getKey(product, days)) ?? Number(settings.price)
        };
    };

    const ensureInlinePrice = (panel) => {
        const wrapper = panel?.querySelector(".newpost-wrapper");
        if (!wrapper) return null;
        let price = wrapper.querySelector(".bakeca-inline-price");
        if (price) return price;

        price = document.createElement("div");
        price.className = "bakeca-inline-price";
        price.innerHTML = [
            "<span>Totale:</span>",
            '<strong class="bakeca-inline-credits">0 crediti</strong>',
            "<span>/</span>",
            '<strong class="bakeca-inline-euros">€ 0.00</strong>'
        ].join(" ");
        wrapper.appendChild(price);
        return price;
    };

    const isDeleted = (panel) => {
        if (!panel || panel.style.display === "none") return true;
        return Boolean(window.jQuery && window.jQuery(panel).data("GCRecord"));
    };

    const refresh = () => {
        let totalCredits = 0;
        let totalPrice = 0;

        document.querySelectorAll(
            ".promo1x .newpost-panel, .promo3x .newpost-panel"
        ).forEach((panel) => {
            const values = getSchedulePrice(panel);
            const price = ensureInlinePrice(panel);
            if (!values || !price) return;

            price.querySelector(".bakeca-inline-credits").textContent =
                `${values.credits} crediti`;
            price.querySelector(".bakeca-inline-euros").textContent =
                formatPrice(values.price);

            if (isDeleted(panel)) return;
            totalCredits += values.credits;
            totalPrice += values.price;
        });

        const credits = document.querySelector("#bakecaTotalCredits");
        const price = document.querySelector("#bakecaTotalPrice");
        if (credits) credits.textContent = `${totalCredits} crediti`;
        if (price) price.textContent = formatPrice(totalPrice);
    };

    const applyStoredPrices = (rows = []) => {
        storedPrices.clear();
        rows.forEach((row) => {
            const price = Number(row.price);
            if (!Number.isFinite(price)) return;
            storedPrices.set(getKey(row.product, row.days), price);
        });
    };

    const loadStoredPrices = async () => {
        try {
            const response = await fetch("/gestPagamenti/getBakecaPrices", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin"
            });
            if (!response.ok) return false;
            const result = await response.json().catch(() => ({}));
            applyStoredPrices(Array.isArray(result.prices) ? result.prices : []);
            return true;
        } catch {
            return false;
        }
    };

    const renderPriceTable = (product) => {
        const body = document.querySelector(
            `[data-bakeca-price-product="${product}"] tbody`
        );
        const productSettings = window.BakecaPriceCatalog?.products?.[product];
        if (!body || !productSettings) return;
        body.innerHTML = "";

        Object.entries(productSettings.durations).forEach(([days, settings]) => {
            const row = document.createElement("tr");
            const duration = document.createElement("td");
            const credits = document.createElement("td");
            const price = document.createElement("td");
            const slots = document.createElement("td");

            duration.textContent = window.BakecaPriceCatalog.durationLabel(days);
            credits.textContent = `${settings.credits} crediti`;
            price.textContent = formatPrice(
                storedPrices.get(getKey(product, days)) ?? settings.price
            );
            productSettings.timeSlots.forEach((slot) => {
                const line = document.createElement("div");
                line.textContent = slot;
                slots.appendChild(line);
            });

            row.appendChild(duration);
            row.appendChild(credits);
            row.appendChild(price);
            row.appendChild(slots);
            body.appendChild(row);
        });
    };

    const renderPriceTables = () => {
        renderPriceTable("toplist1");
        renderPriceTable("toplist3");
    };

    const selectPriceTable = (product) => {
        document.querySelectorAll("[data-bakeca-price-table]").forEach((button) => {
            const active = button.dataset.bakecaPriceTable === product;
            button.classList.toggle("btn-primary", active);
            button.classList.toggle("btn-default", !active);
            button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        document.querySelectorAll("[data-bakeca-price-product]").forEach((table) => {
            table.hidden = table.dataset.bakecaPriceProduct !== product;
        });
    };

    const observeSchedules = () => {
        const target = document.querySelector("#wizar-body");
        if (!target || typeof MutationObserver !== "function") return;
        const observer = new MutationObserver((mutations) => {
            const scheduleChanged = mutations.some((mutation) => {
                return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return false;
                    return node.matches?.(".newpost-panel") ||
                        Boolean(node.querySelector?.(".newpost-panel"));
                });
            });
            if (scheduleChanged) refresh();
        });
        observer.observe(target, { childList: true, subtree: true });
    };

    const initialize = () => {
        document.addEventListener("change", (event) => {
            if (event.target.closest(".promo1x, .promo3x") && event.target.matches("select")) {
                refresh();
            }
        });
        document.addEventListener("click", (event) => {
            if (
                event.target.closest(".promo1x .btn-danger, .promo3x .btn-danger") ||
                event.target.closest(".promo1x .flex-checkbox input, .promo3x .flex-checkbox input")
            ) {
                setTimeout(refresh, 0);
            }
        });

        document.querySelectorAll("[data-bakeca-price-table]").forEach((button) => {
            button.addEventListener("click", () => {
                selectPriceTable(button.dataset.bakecaPriceTable);
            });
        });

        const toggle = document.querySelector("#toggleBakecaPriceList");
        const details = document.querySelector("#bakecaPriceList");
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

        selectPriceTable("toplist1");
        renderPriceTables();
        observeSchedules();
        refresh();
        loadStoredPrices().then((loaded) => {
            if (!loaded) return;
            renderPriceTables();
            refresh();
        });
    };

    window.BakecaPricing = {
        getSchedulePrice,
        loadStoredPrices,
        refresh
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
