(() => {
    const PANEL = "moscarossa";
    const PUBLICATION_IMAGE_LIMIT = 3;
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
    const state = {
        advertisement: null,
        gallery: [],
        schedule: {},
        currentDay: "",
        dirty: false,
        relativeId: 0,
        historyText: []
    };

    const clean = (value) => `${value || ""}`.replace(/\s+/g, " ").trim();
    const isTrue = (value) => value === true || value === 1 || value === "1" || `${value}`.toLowerCase() === "true";
    const pad = (value) => `${value}`.padStart(2, "0");
    const localDateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const todayKey = () => localDateKey(new Date());
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
    const nextDefaultTime = () => {
        if (state.currentDay !== todayKey()) return "08:00";
        const now = new Date();
        now.setMinutes(Math.ceil((now.getMinutes() + 5) / 5) * 5, 0, 0);
        return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };
    const normalizeImages = (images) => (Array.isArray(images) ? images : [])
        .map((image) => ({
            galleria: Number(image?.galleria || image?.id || 0),
            isAnteprima: isTrue(image?.isAnteprima)
        }))
        .filter((image) => image.galleria)
        .slice(0, PUBLICATION_IMAGE_LIMIT);
    const defaultImages = () => state.gallery.slice(0, PUBLICATION_IMAGE_LIMIT).map((image, index) => ({
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
        const images = normalizeImages(slot.images);
        return {
            id: slot.id || "",
            relativeID: slot.relativeID || "",
            remotePostID: slot.remotePostID || "",
            state: slot.state || "",
            time: extractTime(slot.data),
            images: ensurePreview(images.length ? images : defaultImages()),
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
        const selectedIds = new Set(slot.images.map((image) => Number(image.galleria)));
        const previewId = Number(slot.images.find((image) => image.isAnteprima)?.galleria || 0);

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
                    if (slot.images.length >= PUBLICATION_IMAGE_LIMIT) {
                        checkbox.checked = false;
                        return showError(`Puoi selezionare massimo ${PUBLICATION_IMAGE_LIMIT} immagini per la pubblicazione Free.`);
                    }
                    slot.images.push({ galleria: galleryId, isAnteprima: slot.images.length === 0 });
                } else {
                    if (slot.images.length === 1) {
                        checkbox.checked = true;
                        return showError("La pubblicazione Free deve contenere almeno un'immagine.");
                    }
                    slot.images = slot.images.filter((entry) => Number(entry.galleria) !== galleryId);
                    ensurePreview(slot.images);
                }
                markDirty(slot);
                renderDay();
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
                    if (slot.images.length >= PUBLICATION_IMAGE_LIMIT) {
                        return showError(`Puoi selezionare massimo ${PUBLICATION_IMAGE_LIMIT} immagini per la pubblicazione Free.`);
                    }
                    target = { galleria: galleryId, isAnteprima: false };
                    slot.images.push(target);
                }
                slot.images.forEach((entry) => { entry.isAnteprima = entry === target; });
                markDirty(slot);
                renderDay();
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
        panel.dataset.promoType = "Free";
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
        if (slot.state === "KO" && !locked) {
            const retry = createButton("btn btn-warning", "fa-refresh", "Riprova pubblicazione");
            retry.appendChild(document.createTextNode(" Riprova"));
            retry.addEventListener("click", () => {
                markDirty(slot);
                retry.disabled = true;
            });
            main.appendChild(retry);
        }
        main.appendChild(remove);
        const photoButton = createButton("btn btn-dark btnPhoto", "fa-camera", "Mostra o nascondi immagini");
        main.appendChild(photoButton);
        panel.appendChild(main);

        const images = document.createElement("div");
        images.className = "post-pics";
        images.style.display = "none";
        renderImagePicker(slot, images, locked);
        panel.appendChild(images);
        photoButton.addEventListener("click", () => {
            const hidden = images.style.display === "none";
            images.style.display = hidden ? "flex" : "none";
            photoButton.className = `btn btn-${hidden ? "success" : "dark"} btnPhoto`;
        });
        return panel;
    };

    function renderDay() {
        scheduleList.innerHTML = "";
        const slots = state.schedule[state.currentDay] || [];
        const visibleSlots = slots.filter((slot) => !slot.deleted);
        visibleSlots.forEach((slot) => scheduleList.appendChild(renderSlot(slot, slots.indexOf(slot))));
        if (!visibleSlots.length) {
            const empty = document.createElement("div");
            empty.className = "center text-muted innerTB";
            empty.textContent = "Nessuna pubblicazione Free per la data selezionata.";
            scheduleList.appendChild(empty);
        }
        addButton.disabled = !isSavedAdvertisement || state.currentDay < todayKey();
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
        if (!state.gallery.length) return showError("Aggiungi almeno un'immagine prima di programmare la pubblicazione Free.");
        state.relativeId += 1;
        state.schedule[state.currentDay].push({
            id: "",
            relativeID: `moscarossa-${Date.now()}-${state.relativeId}`,
            remotePostID: "",
            state: "",
            time: nextDefaultTime(),
            images: ensurePreview(defaultImages()),
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
                typeAnnuncio: "Free",
                typePeriodic: "Top",
                period: "",
                city: state.advertisement?.city || "",
                hasPremium: false,
                hasVideo: false,
                hasHighlight: false,
                hasEtichetta: false,
                data: `${day}T${slot.time || "08:00"}:00.000Z`,
                images: ensurePreview(normalizeImages(slot.images))
            }));
        });
        return payload;
    };

    const saveSchedule = async () => {
        if (!state.dirty) return;
        const activeSlots = Object.values(state.schedule).flat().filter((slot) => !slot.deleted);
        if (activeSlots.some((slot) => !slot.time)) return showError("Inserisci un orario per ogni pubblicazione Free.");
        if (activeSlots.some((slot) => !slot.images.length)) return showError("Seleziona almeno un'immagine per ogni pubblicazione Free.");
        if (!clean(state.advertisement?.city)) return showError("Seleziona prima il Comune Moscarossa.");

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
            const reloadUrl = new URL(window.location.href);
            reloadUrl.searchParams.set("day", state.currentDay);
            window.location.href = reloadUrl.toString();
        } catch (error) {
            showError(error.message);
            saveButton.disabled = false;
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
        return `[TOP ${record.typeAnnuncio || "Free"}] del ${day}${time ? ` alle ${time}` : ""}`;
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
                EDIT: "IN ATTESA",
                DELETE: "DELETE",
                DELETED: "DELETED"
            };
            status.textContent = suspended
                ? "SOSPESO"
                : (statusLabels[`${record.state || ""}`.toUpperCase()] || "IN ATTESA");
            statusActions.appendChild(status);
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
            const requestedDay = params.get("day") || "";
            selectDay(/^\d{4}-\d{2}-\d{2}$/.test(requestedDay) ? requestedDay : todayKey());
            await loadHistory();
        } catch (error) {
            showError(error.message);
        }
    };

    dateInput.addEventListener("change", () => selectDay(dateInput.value));
    addButton.addEventListener("click", addSchedule);
    saveButton.addEventListener("click", saveSchedule);
    document.querySelectorAll(".moscarossa-copy-all").forEach((element) => {
        element.addEventListener("click", () => {
            if (!state.historyText.length) return showError("Non ci sono pubblicazioni da copiare.");
            copyText(state.historyText.join("\n")).catch(() => showError("Impossibile copiare le pubblicazioni."));
        });
    });
    initializeCalendar();
    loadAdvertisement();
})();
