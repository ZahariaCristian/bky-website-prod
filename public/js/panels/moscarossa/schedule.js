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
    const refreshHistoryButton = document.querySelector("#moscarossaRefreshHistory");
    const state = {
        advertisement: null,
        gallery: [],
        schedule: {},
        currentDay: "",
        dirty: false,
        relativeId: 0
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
            const card = document.createElement("div");
            card.className = `moscarossa-slot-image${selected ? " is-selected" : ""}${previewId === galleryId ? " is-preview" : ""}`;

            const image = document.createElement("img");
            image.src = gallerySrc(galleryImage);
            image.alt = `Foto Moscarossa ${galleryId}`;
            card.appendChild(image);

            const actions = document.createElement("div");
            actions.className = "moscarossa-slot-image-actions";
            const selectionLabel = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selected;
            checkbox.disabled = locked;
            selectionLabel.appendChild(checkbox);
            selectionLabel.appendChild(document.createTextNode(" Usa"));

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

            const previewButton = createButton(
                previewId === galleryId ? "btn btn-warning btn-xs" : "btn btn-default btn-xs",
                "fa-star",
                "Imposta come anteprima"
            );
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

            actions.appendChild(selectionLabel);
            actions.appendChild(previewButton);
            card.appendChild(actions);
            container.appendChild(card);
        });
    };

    const renderSlot = (slot, index) => {
        const locked = Boolean(slot.remotePostID) || slot.state === "OK";
        const panel = document.createElement("div");
        panel.className = "moscarossa-schedule-slot";

        const main = document.createElement("div");
        main.className = "moscarossa-slot-main";
        const date = document.createElement("span");
        date.className = "moscarossa-slot-date";
        date.textContent = state.currentDay;
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
        const type = document.createElement("span");
        type.className = "label label-default";
        type.textContent = "Free";
        const remove = createButton("btn btn-danger", "fa-times", "Rimuovi pubblicazione");
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
        main.appendChild(type);
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
        panel.appendChild(main);

        const help = document.createElement("p");
        help.className = "help-block";
        help.textContent = locked
            ? "Pubblicazione già completata: i dati remoti sono in sola lettura. Crea una nuova uscita Free per ripubblicare."
            : `${slot.images.length}/${PUBLICATION_IMAGE_LIMIT} immagini selezionate. La stella indica l'anteprima.`;
        panel.appendChild(help);
        const images = document.createElement("div");
        images.className = "moscarossa-slot-images";
        renderImagePicker(slot, images, locked);
        panel.appendChild(images);
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
        if (status === "OK") return "label label-success";
        if (status === "KO") return "label label-danger";
        if (["CLOSED", "CLOSE", "DELETE", "DELETED"].includes(status)) return "label label-default";
        if (status === "EDIT") return "label label-warning";
        return "label label-info";
    };

    const historyDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return clean(value);
        return date.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
    };

    const renderHistory = (records) => {
        historyList.innerHTML = "";
        if (!records.length) {
            const empty = document.createElement("div");
            empty.className = "row center";
            empty.textContent = "Nessun dato rilevato";
            historyList.appendChild(empty);
            return;
        }

        records.forEach((record) => {
            const item = document.createElement("div");
            item.className = "moscarossa-history-item";
            const main = document.createElement("div");
            main.className = "moscarossa-history-main";
            const description = document.createElement("div");
            const heading = document.createElement("strong");
            heading.textContent = `${record.typeAnnuncio || "Free"} · ${record.city || state.advertisement?.city || ""}`;
            const date = document.createElement("div");
            date.className = "text-muted";
            date.textContent = historyDate(record.data);
            description.appendChild(heading);
            description.appendChild(date);

            const actions = document.createElement("div");
            const status = document.createElement("span");
            status.className = statusClass(record.state);
            status.textContent = record.state || "PROGRAMMATO";
            actions.appendChild(status);
            if (record.urlBK && /^https?:\/\//i.test(record.urlBK)) {
                const link = document.createElement("a");
                link.className = "btn btn-primary btn-xs";
                link.href = record.urlBK;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "Apri annuncio";
                actions.appendChild(document.createTextNode(" "));
                actions.appendChild(link);
            }

            const error = document.createElement("div");
            error.className = "alert alert-danger moscarossa-history-error";
            error.textContent = clean(record.errorReason);
            if (record.errorReason) {
                const errorButton = createButton("btn btn-danger btn-xs", "fa-exclamation-triangle", "Mostra motivo errore");
                errorButton.addEventListener("click", () => {
                    error.style.display = error.style.display === "block" ? "none" : "block";
                });
                actions.appendChild(document.createTextNode(" "));
                actions.appendChild(errorButton);
            }

            main.appendChild(description);
            main.appendChild(actions);
            item.appendChild(main);
            if (record.remotePostID) {
                const remote = document.createElement("div");
                remote.className = "text-muted";
                remote.textContent = `ID Moscarossa: ${record.remotePostID}`;
                item.appendChild(remote);
            }
            item.appendChild(error);
            historyList.appendChild(item);
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
        if (!isSavedAdvertisement) return renderHistory([]);
        try {
            const [active, suspended] = await Promise.all([fetchHistoryPart(false), fetchHistoryPart(true)]);
            const records = [...active, ...suspended]
                .filter((record, index, all) => all.findIndex((item) => Number(item.id) === Number(record.id)) === index)
                .sort((left, right) => new Date(right.data) - new Date(left.data));
            renderHistory(records);
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
            renderHistory([]);
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
    refreshHistoryButton.addEventListener("click", loadHistory);
    initializeCalendar();
    loadAdvertisement();
})();
