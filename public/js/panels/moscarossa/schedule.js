(() => {
    const PANEL = "moscarossa";
    const PROMOTION_PLANS = Object.freeze({
        Free: { imageLimit: 5, paid: false },
        Premium: { imageLimit: 10, paid: true },
        Top: { imageLimit: 10, paid: true },
        Red: { imageLimit: 15, paid: true },
        Gold: { imageLimit: 20, paid: true }
    });
    const PROMOTION_DURATIONS = [1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 25, 30];
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get("edit") || "";
    const annuncioId = Number.parseInt(rawId, 10);
    const isSavedAdvertisement = Number.isFinite(annuncioId) && annuncioId > 0;
    const dateInput = document.querySelector("#moscarossaScheduleDate");
    const scheduleList = document.querySelector("#moscarossaScheduleList");
    const addButton = document.querySelector("#moscarossaAddSchedule");
    const saveButton = document.querySelector("#moscarossaSaveSchedule");
    const historyList = document.querySelector("#moscarossaHistoryList");
    const suspendedHistoryList = document.querySelector("#moscarossaHistorySuspendedList");
    const suspendedHistoryTitle = document.querySelector("#moscarossaHistorySuspendedTitle");
    const whatsappHistoryButton = document.querySelector("#moscarossaWhatsappHistory");
    const promotionHelp = document.querySelector("#moscarossaPromotionHelp");
    const promotionTabs = Array.from(document.querySelectorAll("[data-moscarossa-plan]"));
    const state = {
        advertisement: null,
        gallery: [],
        schedule: {},
        currentDay: "",
        currentPlan: "Free",
        dirty: false,
        relativeId: 0,
        historyText: []
    };

    const clean = (value) => `${value || ""}`.replace(/\s+/g, " ").trim();
    const isTrue = (value) => value === true || value === 1 || value === "1" || `${value}`.toLowerCase() === "true";
    const pad = (value) => `${value}`.padStart(2, "0");
    const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const romeDateParts = (date = new Date()) => Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Rome",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date).map((part) => [part.type, part.value])
    );
    const todayKey = () => {
        const parts = romeDateParts();
        return `${parts.year}-${parts.month}-${parts.day}`;
    };
    const showError = (message) => {
        if (typeof ShowAlert === "function") return ShowAlert("custom", message, 6000);
        window.alert(message);
    };
    const gallerySrc = (image) => {
        const src = image?.src || "";
        if (!image?.id || !src.includes("?") || /[?&]id=/.test(src)) return src;
        return `${src}&id=${encodeURIComponent(image.id)}`;
    };
    const extractTime = (value) => `${value || ""}`.match(/T(\d{2}:\d{2})/)?.[1] || "08:00";
    const normalizePlan = (value) => Object.keys(PROMOTION_PLANS)
        .find((plan) => plan.toLowerCase() === clean(value).toLowerCase()) || "Free";
    const parsePeriod = (value, fallbackPlan) => {
        let parsed = {};
        try { parsed = typeof value === "string" ? JSON.parse(value || "{}") : (value || {}); } catch { parsed = {}; }
        const details = parsed.moscarossa || parsed;
        const plan = normalizePlan(details.plan || fallbackPlan);
        const requestedDays = Number.parseInt(details.days || details.duration || 1, 10);
        return { plan, days: PROMOTION_DURATIONS.includes(requestedDays) ? requestedDays : 1 };
    };
    const nextDefaultTime = () => {
        const parts = Object.fromEntries(
            new Intl.DateTimeFormat("en-GB", {
                timeZone: "Europe/Rome",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }).formatToParts(new Date()).map((part) => [part.type, part.value])
        );
        return `${parts.hour}:${parts.minute}`;
    };
    const normalizeImages = (images, limit = 20) => (Array.isArray(images) ? images : [])
        .map((image) => ({
            galleria: Number(image?.galleria || image?.id || 0),
            isAnteprima: isTrue(image?.isAnteprima)
        }))
        .filter((image) => image.galleria)
        .slice(0, limit);
    const defaultImages = (limit = 20) => state.gallery.slice(0, limit).map((image, index) => ({
        galleria: Number(image.id),
        isAnteprima: index === 0
    }));
    const ensurePreview = (images) => {
        if (!images.length) return images;
        if (!images.some((image) => image.isAnteprima)) images[0].isAnteprima = true;
        let previewFound = false;
        images.forEach((image) => {
            if (!image.isAnteprima) return;
            image.isAnteprima = !previewFound;
            previewFound = true;
        });
        return images;
    };

    const normalizeSlot = (slot = {}) => {
        const period = parsePeriod(slot.period, slot.typeAnnuncio);
        const imageLimit = PROMOTION_PLANS[period.plan].imageLimit;
        const images = normalizeImages(slot.images, imageLimit);
        const selectedImages = ensurePreview(images.length ? images : defaultImages(imageLimit));
        return {
            id: slot.id || "",
            relativeID: slot.relativeID || "",
            remotePostID: slot.remotePostID || "",
            state: slot.state || "",
            errorReason: slot.errorReason || "",
            urlBK: slot.urlBK || "",
            time: extractTime(slot.data),
            plan: period.plan,
            days: period.days,
            images: selectedImages,
            imagesExpanded: selectedImages.length > 0,
            deleted: Boolean(slot.GCRecord),
            dirty: false
        };
    };

    const markDirty = (slot) => {
        if (slot) slot.dirty = true;
        state.dirty = true;
        saveButton.disabled = false;
    };

    const createButton = (className, icon, title) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.innerHTML = `<i class="fa ${icon}"></i>`;
        return button;
    };

    const renderImagePicker = (slot, container, locked = false) => {
        const imageLimit = PROMOTION_PLANS[slot.plan].imageLimit;
        const selectedIds = new Set(slot.images.map((image) => Number(image.galleria)));
        const previewId = Number(slot.images.find((image) => image.isAnteprima)?.galleria || 0);
        const refreshPicker = () => {
            const currentDisplay = container.style.display;
            container.innerHTML = "";
            renderImagePicker(slot, container, locked);
            container.style.display = currentDisplay;
        };

        state.gallery.forEach((galleryImage) => {
            const galleryId = Number(galleryImage.id);
            const selected = selectedIds.has(galleryId);
            const wrapper = document.createElement("div");
            wrapper.className = "post-pic-wrapper";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "form-check-input";
            checkbox.checked = selected;
            checkbox.disabled = locked;
            const imageId = `moscarossa-schedule-${galleryId}-${Math.random().toString(36).slice(2)}`;
            checkbox.id = imageId;

            const imageLabel = document.createElement("label");
            imageLabel.htmlFor = imageId;
            const image = document.createElement("img");
            image.src = gallerySrc(galleryImage);
            image.alt = `Foto Moscarossa ${galleryId}`;
            imageLabel.appendChild(image);

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    if (slot.images.length >= imageLimit) {
                        checkbox.checked = false;
                        return showError(`Puoi selezionare massimo ${imageLimit} immagini per la pubblicazione ${slot.plan}.`);
                    }
                    slot.images.push({ galleria: galleryId, isAnteprima: slot.images.length === 0 });
                } else {
                    if (slot.images.length === 1) {
                        checkbox.checked = true;
                        return showError(`La pubblicazione ${slot.plan} deve contenere almeno un'immagine.`);
                    }
                    slot.images = slot.images.filter((entry) => Number(entry.galleria) !== galleryId);
                    ensurePreview(slot.images);
                }
                markDirty(slot);
                refreshPicker();
            });

            const previewButton = document.createElement("button");
            previewButton.type = "button";
            previewButton.className = previewId === galleryId
                ? "btn btn-warning btn-anteprima"
                : "btn btn-secondary btn-anteprima";
            previewButton.textContent = "ANTEPRIMA";
            previewButton.title = "Imposta come anteprima";
            previewButton.disabled = locked;
            previewButton.addEventListener("click", () => {
                let target = slot.images.find((entry) => Number(entry.galleria) === galleryId);
                if (!target) {
                    if (slot.images.length >= imageLimit) {
                        return showError(`Puoi selezionare massimo ${imageLimit} immagini per la pubblicazione ${slot.plan}.`);
                    }
                    target = { galleria: galleryId, isAnteprima: false };
                    slot.images.push(target);
                }
                slot.images.forEach((entry) => { entry.isAnteprima = entry === target; });
                markDirty(slot);
                refreshPicker();
            });

            wrapper.appendChild(checkbox);
            wrapper.appendChild(imageLabel);
            wrapper.appendChild(previewButton);
            container.appendChild(wrapper);
        });
    };

    const renderSlot = (slot, index) => {
        const locked = Boolean(slot.remotePostID) || slot.state === "OK";
        const panel = document.createElement("div");
        panel.className = "newpost-panel";
        panel.dataset.promoType = slot.plan;
        panel.dataset.relativeId = slot.relativeID || "";

        const main = document.createElement("div");
        main.className = "newpost-wrapper";
        const date = document.createElement("label");
        date.className = "lblDateTime";
        date.textContent = `${state.currentDay} `;
        const time = document.createElement("input");
        time.type = "time";
        time.className = "form-control";
        time.required = true;
        time.value = slot.time;
        time.disabled = locked;
        time.addEventListener("change", () => {
            slot.time = time.value;
            markDirty(slot);
        });
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-danger";
        remove.title = "Rimuovi pubblicazione";
        remove.setAttribute("aria-label", "Rimuovi pubblicazione");
        remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="white" width="25" height="20" viewBox="0 0 503.021 503.021" style="transform:scale(.7) translate(-6px,2px)"><path d="M491.613 75.643 427.378 11.408c-15.202-15.202-39.854-15.202-55.056 0L251.507 132.222 130.686 11.407c-15.202-15.202-39.853-15.202-55.055 0L11.401 75.643c-15.202 15.202-15.202 39.854 0 55.056l120.821 120.815L11.401 372.328c-15.202 15.202-15.202 39.854 0 55.056l64.235 64.229c15.202 15.202 39.854 15.202 55.056 0l120.815-120.814 120.822 120.814c15.202 15.202 39.854 15.202 55.056 0l64.235-64.229c15.202-15.202 15.202-39.854 0-55.056L370.793 251.514l120.82-120.815c15.202-15.209 15.202-39.854 0-55.056Z"/></svg>';
        remove.disabled = locked;
        remove.addEventListener("click", () => {
            if (slot.id) {
                slot.deleted = true;
                markDirty(slot);
            } else {
                state.schedule[state.currentDay].splice(index, 1);
                markDirty();
            }
            renderDay();
        });

        main.appendChild(date);
        main.appendChild(time);
        if (PROMOTION_PLANS[slot.plan].paid) {
            const duration = document.createElement("select");
            duration.className = "form-control moscarossa-promotion-duration";
            duration.title = `Durata ${slot.plan}`;
            PROMOTION_DURATIONS.forEach((days) => {
                const option = document.createElement("option");
                option.value = `${days}`;
                option.textContent = `${days} ${days === 1 ? "giorno" : "giorni"}`;
                duration.appendChild(option);
            });
            duration.value = `${slot.days}`;
            duration.disabled = locked;
            duration.addEventListener("change", () => {
                slot.days = Number.parseInt(duration.value, 10) || 1;
                markDirty(slot);
            });
            main.appendChild(duration);
        }
        main.appendChild(remove);
        const photoButton = createButton(
            `btn btn-${slot.imagesExpanded ? "success" : "dark"} btnPhoto`,
            "fa-camera",
            "Mostra o nascondi immagini"
        );
        main.appendChild(photoButton);
        const waitingForSms = `${slot.state || ""}`.toUpperCase() === "ALERT" &&
            /verifica sms|waiting_sms|verifica.*telefon/i.test(`${slot.errorReason || ""}`);
        if (waitingForSms) {
            const verifyButton = createButton(
                "btn btn-warning moscarossa-verify-sms",
                "fa-mobile",
                "Verifica telefono e completa la pubblicazione"
            );
            verifyButton.appendChild(document.createTextNode(" Verifica telefono"));
            verifyButton.addEventListener("click", async () => {
                if (!window.MoscarossaPhoneVerification?.start) {
                    return showError("Il servizio di verifica Moscarossa non è disponibile.");
                }
                verifyButton.disabled = true;
                try {
                    await window.MoscarossaPhoneVerification.start({
                        scheduleId: slot.id,
                        remoteId: slot.remotePostID,
                        resume: true
                    });
                } catch {
                    verifyButton.disabled = false;
                }
            });
            main.appendChild(verifyButton);
        }
        panel.appendChild(main);

        const images = document.createElement("div");
        images.className = "post-pics";
        images.style.display = slot.imagesExpanded ? "flex" : "none";
        renderImagePicker(slot, images, locked);
        panel.appendChild(images);
        photoButton.addEventListener("click", () => {
            const hidden = images.style.display === "none";
            images.style.display = hidden ? "flex" : "none";
            slot.imagesExpanded = hidden;
            photoButton.className = `btn btn-${hidden ? "success" : "dark"} btnPhoto`;
        });
        return panel;
    };

    function renderDay() {
        scheduleList.innerHTML = "";
        const slots = state.schedule[state.currentDay] || [];
        const visibleSlots = slots.filter((slot) => !slot.deleted && slot.plan === state.currentPlan);
        visibleSlots.forEach((slot) => scheduleList.appendChild(renderSlot(slot, slots.indexOf(slot))));
        addButton.disabled = !isSavedAdvertisement || state.currentDay < todayKey();
        const plan = PROMOTION_PLANS[state.currentPlan];
        promotionHelp.textContent = plan.paid
            ? `${state.currentPlan}: massimo ${plan.imageLimit} immagini. Seleziona la durata per calcolare e acquistare la promozione con i crediti Moscarossa.`
            : `Free: massimo ${plan.imageLimit} immagini. Moscarossa può richiedere la verifica SMS del telefono.`;
    }

    const selectDay = (day) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
        state.currentDay = day;
        dateInput.value = day;
        if (!state.schedule[day]) state.schedule[day] = [];
        renderDay();
    };

    const addSchedule = () => {
        if (!isSavedAdvertisement) return showError("Salva prima le informazioni dell'annuncio.");
        if (state.currentDay < todayKey()) return showError("Non puoi aggiungere una pubblicazione nel passato.");
        if (!state.gallery.length) return showError(`Aggiungi almeno un'immagine prima di programmare la pubblicazione ${state.currentPlan}.`);
        const imageLimit = PROMOTION_PLANS[state.currentPlan].imageLimit;
        state.relativeId += 1;
        state.schedule[state.currentDay].push({
            id: "",
            relativeID: `moscarossa-${state.currentPlan.toLowerCase()}-${Date.now()}-${state.relativeId}`,
            remotePostID: "",
            state: "",
            time: nextDefaultTime(),
            plan: state.currentPlan,
            days: 1,
            images: ensurePreview(defaultImages(imageLimit)),
            imagesExpanded: false,
            deleted: false,
            dirty: true
        });
        markDirty();
        renderDay();
    };

    const serializeSchedule = () => {
        const payload = {};
        Object.entries(state.schedule).forEach(([day, slots]) => {
            payload[day] = slots.map((slot) => ({
                id: slot.id || "",
                relativeID: slot.relativeID || "",
                state: slot.id && slot.dirty ? "EDIT" : slot.state,
                GCRecord: slot.deleted ? true : null,
                // tblSchedulazioni.typeAnnuncio is a legacy ENUM. Moscarossa's
                // real plan is stored in period to avoid a database migration.
                typeAnnuncio: "Free",
                typePeriodic: "Top",
                period: slot.plan === "Free" ? "" : JSON.stringify({ moscarossa: { plan: slot.plan, days: slot.days } }),
                city: state.advertisement?.city || "",
                hasPremium: PROMOTION_PLANS[slot.plan].paid,
                hasVideo: false,
                hasHighlight: false,
                hasEtichetta: false,
                data: `${day}T${slot.time || "08:00"}:00.000Z`,
                images: ensurePreview(normalizeImages(slot.images, PROMOTION_PLANS[slot.plan].imageLimit))
            }));
        });
        return payload;
    };

    const saveSchedule = async ({ reload = true } = {}) => {
        if (!state.dirty) return { ok: true, skipped: true };
        const activeSlots = Object.values(state.schedule).flat().filter((slot) => !slot.deleted);
        if (activeSlots.some((slot) => !slot.time)) throw new Error("Inserisci un orario per ogni pubblicazione Moscarossa.");
        if (activeSlots.some((slot) => !slot.images.length)) throw new Error("Seleziona almeno un'immagine per ogni pubblicazione Moscarossa.");
        if (!clean(state.advertisement?.city)) throw new Error("Seleziona prima il Comune Moscarossa.");

        saveButton.disabled = true;
        try {
            const response = await fetch("/annuncio/updateSchedule", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: annuncioId, panel: PANEL, schedule: serializeSchedule() })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || "Impossibile salvare le pubblicazioni Moscarossa.");
            (payload.schedulato || []).forEach((savedSlot) => {
                if (!savedSlot?.relativeID) return;
                Object.values(state.schedule).flat().forEach((slot) => {
                    if (`${slot.relativeID || ""}` !== `${savedSlot.relativeID}`) return;
                    slot.id = savedSlot.id || slot.id;
                    slot.state = savedSlot.state || slot.state;
                });
            });
            Object.values(state.schedule).flat().forEach((slot) => { slot.dirty = false; });
            state.dirty = false;
            saveButton.disabled = true;
            if (reload) {
                const reloadUrl = new URL(window.location.href);
                reloadUrl.searchParams.set("day", state.currentDay);
                reloadUrl.searchParams.set("promo", state.currentPlan);
                window.location.href = reloadUrl.toString();
            }
            return { ok: true, payload };
        } catch (error) {
            saveButton.disabled = false;
            throw error;
        }
    };

    const statusClass = (status) => {
        if (status === "OK") return "btn btn-xs btn-success";
        if (status === "KO") return "btn btn-xs btn-danger";
        if (["CLOSED", "CLOSE", "DELETE", "DELETED"].includes(status)) return "btn btn-xs btn-default";
        if (status === "EDIT") return "btn btn-xs btn-warning";
        return "btn btn-xs btn-info";
    };

    const historyDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return clean(value);
        return date.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
    };

    const historyDescription = (record) => {
        const value = `${record.data || ""}`;
        const day = value.split("T")[0] || historyDate(value);
        const time = value.match(/T(\d{2}:\d{2})/)?.[1] || "";
        const plan = parsePeriod(record.period, record.typeAnnuncio).plan;
        return `[TOP ${plan}] del ${day}${time ? ` alle ${time}` : ""}`;
    };

    const copyText = async (value) => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
        } else {
            const input = document.createElement("textarea");
            input.value = value;
            input.style.position = "fixed";
            input.style.opacity = "0";
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
        }
        if (typeof ShowAlert === "function") ShowAlert("lblCopied");
    };

    const statusIcon = (record) => {
        const icon = document.createElement("h3");
        const status = `${record.state || ""}`.toUpperCase();
        if (status === "OK") icon.className = "fa fa-check-square text-success";
        else if (status === "KO") icon.className = "fa fa-times text-danger";
        else if (["CLOSE", "CLOSED"].includes(status)) icon.className = "fa fa-ban text-danger";
        else if (["DELETE", "DELETED"].includes(status)) icon.className = "fa fa-trash text-danger";
        else icon.className = "fa fa-clock-o text-default";
        return icon;
    };

    const renderHistoryTable = (records, container, suspended = false) => {
        container.innerHTML = "";
        if (!records.length) {
            const empty = document.createElement("div");
            empty.className = "row center moscarossa-history-empty";
            empty.textContent = "Nessun dato rilevato";
            container.appendChild(empty);
            return [];
        }

        return records.map((record) => {
            const descriptionText = historyDescription(record);
            const city = clean(record.city || state.advertisement?.city || "Non presente");
            const shareText = `${descriptionText} (${city})`;
            const row = document.createElement("div");
            row.className = "row moscarossa-history-row";
            row.dataset.id = record.id || "";

            const actions = document.createElement("div");
            actions.className = "col-md-2 col-sm-2 moscarossa-history-actions";
            const copyButton = createButton("btn", "fa-copy text-primary", "Copia pubblicazione");
            copyButton.addEventListener("click", () => copyText(shareText).catch(() => showError("Impossibile copiare la pubblicazione.")));
            const share = document.createElement("a");
            share.className = "btn";
            share.href = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
            share.target = "_blank";
            share.title = "Condividi pubblicazione";
            share.innerHTML = '<i class="fa fa-whatsapp text-primary"></i>';
            actions.appendChild(copyButton);
            actions.appendChild(share);

            const description = document.createElement("div");
            description.className = "rptDescription col-md-4 col-sm-4";
            const heading = document.createElement("b");
            heading.textContent = descriptionText;
            description.appendChild(heading);
            description.appendChild(document.createTextNode(` (${city})`));
            if (record.remotePostID) {
                const remote = document.createElement("div");
                remote.className = "text-muted";
                remote.textContent = `ID Moscarossa: ${record.remotePostID}`;
                description.appendChild(remote);
            }

            const statusColumn = document.createElement("div");
            statusColumn.className = "col-md-4 col-sm-4";
            const statusActions = document.createElement("div");
            statusActions.className = "status-actions moscarossa-history-status";
            statusActions.appendChild(statusIcon(record));
            const status = document.createElement("span");
            status.className = statusClass(record.state);
            const statusLabels = {
                OK: "PUBBLICATO",
                KO: "ERRORE",
                ALERT: "VERIFICA SMS",
                EDIT: "IN ATTESA",
                DELETE: "DELETE",
                DELETED: "DELETED"
            };
            status.textContent = suspended
                ? "SOSPESO"
                : (statusLabels[`${record.state || ""}`.toUpperCase()] || "IN ATTESA");
            statusActions.appendChild(status);
            const waitingForSms = `${record.state || ""}`.toUpperCase() === "ALERT" &&
                /verifica sms|waiting_sms|verifica.*telefon/i.test(`${record.errorReason || ""}`);
            if (waitingForSms) {
                const verifyButton = createButton(
                    "btn btn-warning btn-xs",
                    "fa-mobile",
                    "Verifica telefono e completa la pubblicazione"
                );
                verifyButton.addEventListener("click", async () => {
                    if (!window.MoscarossaPhoneVerification?.start) {
                        return showError("Il servizio di verifica Moscarossa non è disponibile.");
                    }
                    verifyButton.disabled = true;
                    try {
                        await window.MoscarossaPhoneVerification.start({
                            scheduleId: record.id,
                            remoteId: record.remotePostID,
                            resume: true
                        });
                    } catch {
                        verifyButton.disabled = false;
                    }
                });
                statusActions.appendChild(verifyButton);
            }
            if (record.urlBK && /^https?:\/\//i.test(record.urlBK)) {
                const link = document.createElement("a");
                link.className = "btn btn-success btn-xs";
                link.href = record.urlBK;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "MR";
                statusActions.appendChild(link);
            }
            if (record.errorReason) {
                const errorButton = createButton("btn btn-danger btn-xs", "fa-exclamation-triangle", "Mostra motivo errore");
                errorButton.addEventListener("click", () => showError(`Pubblicazione non riuscita: ${clean(record.errorReason)}`));
                statusActions.appendChild(errorButton);
            }
            statusColumn.appendChild(statusActions);

            const paid = document.createElement("div");
            paid.className = "col-md-1 col-sm-1";
            const paidIcon = document.createElement("h3");
            paidIcon.className = record.payed
                ? "fa fa-check-square text-success"
                : "fa fa-times text-danger";
            paid.appendChild(paidIcon);

            row.appendChild(actions);
            row.appendChild(description);
            row.appendChild(statusColumn);
            row.appendChild(paid);
            container.appendChild(row);
            return shareText;
        });
    };

    const fetchHistoryPart = async (suspended) => {
        const response = await fetch("/annuncio/storico", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: annuncioId, panel: PANEL, sus: suspended })
        });
        if (!response.ok) throw new Error("Impossibile caricare lo storico Moscarossa.");
        return (await response.json()).storico || [];
    };

    const loadHistory = async () => {
        if (!isSavedAdvertisement) {
            state.historyText = renderHistoryTable([], historyList);
            renderHistoryTable([], suspendedHistoryList, true);
            suspendedHistoryTitle.style.display = "none";
            return;
        }
        try {
            const [active, suspended] = await Promise.all([fetchHistoryPart(false), fetchHistoryPart(true)]);
            const sortNewest = (records) => [...records].sort((left, right) => new Date(right.data) - new Date(left.data));
            state.historyText = renderHistoryTable(sortNewest(active), historyList);
            renderHistoryTable(sortNewest(suspended), suspendedHistoryList, true);
            suspendedHistoryTitle.style.display = suspended.length ? "block" : "none";
            whatsappHistoryButton.href = `whatsapp://send?text=${encodeURIComponent(state.historyText.join("\n"))}`;
        } catch (error) {
            showError(error.message);
        }
    };

    const initializeCalendar = () => {
        if (!window.jQuery || typeof $.fn.simpleCalendar !== "function") return;
        $("#moscarossaCalendarContainer").simpleCalendar({
            months: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
            days: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
            displayYear: true,
            fixedStartDay: true,
            displayEvent: false,
            disableEventDetails: true,
            events: [],
            onDateSelect: (date) => selectDay(localDateKey(date))
        });
    };

    const loadAdvertisement = async () => {
        if (!isSavedAdvertisement) {
            addButton.disabled = true;
            dateInput.disabled = true;
            saveButton.disabled = true;
            scheduleList.innerHTML = '<div class="alert alert-info">Salva prima le informazioni dell\'annuncio per programmare una pubblicazione.</div>';
            loadHistory();
            return;
        }

        try {
            const response = await fetch("/annuncio/getByID", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: annuncioId, panel: PANEL })
            });
            if (!response.ok) throw new Error("Impossibile caricare le pubblicazioni Moscarossa.");
            const advertisement = await response.json();
            state.advertisement = advertisement;
            state.gallery = (advertisement.images || []).filter((image) => !isTrue(image.isHidden)).slice(0, 20);
            state.schedule = {};
            Object.entries(advertisement.schedule || {}).forEach(([day, slots]) => {
                state.schedule[day] = (slots || []).map(normalizeSlot);
            });
            state.currentPlan = normalizePlan(params.get("promo") || "Free");
            promotionTabs.forEach((tab) => {
                tab.closest("li")?.classList.toggle("active", normalizePlan(tab.dataset.moscarossaPlan) === state.currentPlan);
            });
            const requestedDay = params.get("day") || "";
            selectDay(/^\d{4}-\d{2}-\d{2}$/.test(requestedDay) ? requestedDay : todayKey());
            await loadHistory();
        } catch (error) {
            showError(error.message);
        }
    };

    dateInput.addEventListener("change", () => selectDay(dateInput.value));
    addButton.addEventListener("click", addSchedule);
    promotionTabs.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            state.currentPlan = normalizePlan(link.dataset.moscarossaPlan);
            promotionTabs.forEach((tab) => tab.closest("li")?.classList.toggle("active", tab === link));
            renderDay();
        });
    });
    saveButton.addEventListener("click", () => {
        saveSchedule().catch((error) => showError(error.message));
    });
    document.querySelectorAll(".moscarossa-copy-all").forEach((element) => {
        element.addEventListener("click", () => {
            if (!state.historyText.length) return showError("Non ci sono pubblicazioni da copiare.");
            copyText(state.historyText.join("\n")).catch(() => showError("Impossibile copiare le pubblicazioni."));
        });
    });
    window.MoscarossaSchedule = {
        hasPendingChanges: () => state.dirty,
        savePending: () => saveSchedule({ reload: false })
    };

    initializeCalendar();
    loadAdvertisement();
})();
