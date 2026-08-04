(() => {
    const PANEL = "moscarossa";
    const MAX_IMAGES = 20;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const params = new URLSearchParams(window.location.search);
    const editValue = params.get("edit") || "new";
    const isNew = editValue === "new";
    const annuncioId = isNew ? null : Number.parseInt(editValue, 10);

    const state = {
        donnaId: null,
        phone: "",
        images: [],
        previewKey: ""
    };

    const field = (name) => document.querySelector(`[name='${name}']`);
    const setValue = (name, value) => {
        const input = field(name);
        if (input) input.value = value === null || value === undefined ? "" : value;
    };
    const setChecked = (name, value) => {
        const input = field(name);
        if (input) input.checked = Boolean(value);
    };
    const clean = (value) => `${value || ""}`.replace(/\s+/g, " ").trim();
    const showError = (message) => ShowAlert("custom", message, 5000);
    const imageKey = (image) => image.id ? `gallery-${image.id}` : image.key;
    const infoForm = document.querySelector("#moscarossaInfoForm");
    const editInfoButton = document.querySelector("#moscarossaEditInfo");
    const saveInfoButton = document.querySelector("#moscarossaSaveInfo");
    const galleryImageSrc = (image) => {
        if (!image?.id || !image.src || !image.src.includes("?")) return image?.src || "";
        if (/[?&]id=/.test(image.src)) return image.src;
        return `${image.src}&id=${encodeURIComponent(image.id)}`;
    };

    const setFormEditing = (editing) => {
        infoForm.querySelectorAll("input:not([type='hidden']), textarea, select").forEach((control) => {
            control.disabled = !editing;
        });
        saveInfoButton.disabled = !editing;
        editInfoButton.style.display = editing || isNew ? "none" : "block";
    };

    const parseMoscarossaNote = (note) => {
        try {
            const parsed = typeof note === "string" ? JSON.parse(note || "{}") : (note || {});
            return parsed.moscarossa || {};
        } catch {
            return {};
        }
    };

    const collectInfo = () => ({
        title: clean(field("title")?.value),
        description: clean(field("description")?.value),
        city: clean(field("city")?.value),
        location: clean(field("location")?.value),
        phone: clean(field("phone")?.value),
        name: clean(field("name")?.value),
        categorie: field("categorie")?.value || "",
        sono: field("categorie")?.value || "",
        age: clean(field("age")?.value),
        whatsapp: Boolean(field("whatsapp")?.checked),
        telegram: Boolean(field("telegram")?.checked),
        serviceNazionalita: "",
        moscarossa: {
            categoryId: {
                DONNAUOMO: "1",
                TRANS: "5",
                UOMODONNA: "2",
                MASSAGGI: "12"
            }[field("categorie")?.value] || "",
            zoneId: clean(field("zoneId")?.value),
            zone: clean(field("location")?.value),
            address: clean(field("address")?.value),
            zoneDetail: clean(field("zoneDetail")?.value),
            latitude: clean(field("latitude")?.value),
            longitude: clean(field("longitude")?.value),
            airConditioned: Boolean(field("airConditioned")?.checked),
            website: clean(field("website")?.value),
            previewGalleryId: state.previewKey.replace(/^gallery-/, "")
        }
    });

    const validateInfo = (info) => {
        if (!info.categorie) return "Seleziona la categoria Moscarossa.";
        if (info.name.length < 2) return "Inserisci il nome.";
        if (info.title.length < 5) return "Il titolo deve contenere almeno 5 caratteri.";
        if (info.description.length < 20) return "La descrizione deve contenere almeno 20 caratteri.";
        if (!/^\d+$/.test(info.phone)) return "Il telefono deve contenere solo numeri.";
        if (!info.city) return "Inserisci il Comune.";
        if (info.age && (!/^\d{2}$/.test(info.age) || Number(info.age) < 18 || Number(info.age) > 99)) {
            return "L'età deve essere compresa tra 18 e 99 anni.";
        }
        return "";
    };

    const saveInfo = async ({ redirect = false, showSuccess = true, manageLoader = true } = {}) => {
        const info = collectInfo();
        const validationError = validateInfo(info);
        if (validationError) {
            showError(validationError);
            return null;
        }

        if (manageLoader) toggleLoader();
        try {
            const response = await fetch("/annuncio/updateInfo", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    info,
                    panel: PANEL,
                    id: annuncioId || 0
                })
            });

            if (response.status === 422) {
                const payload = await response.json();
                throw new Error(payload.error || "I dati Moscarossa non sono validi.");
            }
            if (!response.ok) throw new Error("Impossibile salvare le informazioni Moscarossa.");

            const saved = await response.json();
            if (showSuccess) ShowAlert("lblSaved");
            if (redirect) {
                window.location.href = `/annuncio.html?edit=${saved.id}&panel=${PANEL}`;
            } else {
                setFormEditing(false);
            }
            return saved;
        } catch (error) {
            showError(error.message);
            return null;
        } finally {
            if (manageLoader) toggleLoader();
        }
    };

    const renderImages = () => {
        const grid = document.querySelector("#moscarossaImageGrid");
        grid.innerHTML = "";

        state.images.forEach((image, index) => {
            const key = imageKey(image);
            const card = document.createElement("div");
            card.className = `moscarossa-image-card${state.previewKey === key ? " is-preview" : ""}`;
            card.dataset.key = key;

            const picture = document.createElement("img");
            picture.src = galleryImageSrc(image);
            picture.alt = `Foto Moscarossa ${index + 1}`;
            card.appendChild(picture);

            const previewLabel = document.createElement("label");
            previewLabel.className = "moscarossa-preview-label";
            const preview = document.createElement("input");
            preview.type = "radio";
            preview.name = "moscarossaPreview";
            preview.checked = state.previewKey === key;
            preview.addEventListener("change", () => {
                state.previewKey = key;
                renderImages();
                document.querySelector("#moscarossaSaveImages").disabled = false;
            });
            previewLabel.append(preview, document.createTextNode(" Anteprima"));
            card.appendChild(previewLabel);

            const actions = document.createElement("div");
            actions.className = "moscarossa-image-actions";
            [
                { icon: "fa-arrow-left", action: "left", disabled: index === 0 },
                { icon: "fa-arrow-right", action: "right", disabled: index === state.images.length - 1 },
                { icon: "fa-trash", action: "remove", danger: true, disabled: false }
            ].forEach((definition) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = `btn btn-sm ${definition.danger ? "btn-danger" : "btn-default"}`;
                button.disabled = definition.disabled;
                button.innerHTML = `<i class="fa ${definition.icon}"></i>`;
                button.addEventListener("click", () => handleImageAction(definition.action, index));
                actions.appendChild(button);
            });
            card.appendChild(actions);
            grid.appendChild(card);
        });
    };

    const handleImageAction = async (action, index) => {
        const image = state.images[index];
        if (!image) return;

        if (action === "left" && index > 0) {
            [state.images[index - 1], state.images[index]] = [state.images[index], state.images[index - 1]];
        } else if (action === "right" && index < state.images.length - 1) {
            [state.images[index + 1], state.images[index]] = [state.images[index], state.images[index + 1]];
        } else if (action === "remove") {
            if (!window.confirm("Rimuovere questa immagine?")) return;
            if (image.id) {
                const response = await fetch("/images/romoveImg", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: image.id })
                });
                if (!response.ok) return showError("Impossibile rimuovere l'immagine.");
            }
            if (image.file) URL.revokeObjectURL(image.src);
            const removedKey = imageKey(image);
            state.images.splice(index, 1);
            if (state.previewKey === removedKey) {
                state.previewKey = state.images.length ? imageKey(state.images[0]) : "";
            }
        }

        renderImages();
        document.querySelector("#moscarossaSaveImages").disabled = false;
    };

    const addSelectedImages = (files) => {
        const accepted = Array.from(files || []).filter((file) => {
            if (!file.type.startsWith("image/")) {
                showError(`${file.name} non è un'immagine valida.`);
                return false;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                showError(`${file.name} supera il limite di 5 MB.`);
                return false;
            }
            return true;
        });

        const available = MAX_IMAGES - state.images.length;
        if (accepted.length > available) {
            showError(`Moscarossa accetta al massimo ${MAX_IMAGES} immagini.`);
        }

        accepted.slice(0, available).forEach((file) => {
            state.images.push({
                key: `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                src: URL.createObjectURL(file),
                file,
                origin: file.name
            });
        });

        if (!state.previewKey && state.images.length) state.previewKey = imageKey(state.images[0]);
        renderImages();
        document.querySelector("#moscarossaSaveImages").disabled = state.images.length === 0;
    };

    const registerPendingGalleryImages = async () => {
        for (const image of state.images) {
            if (!image.file || image.id) continue;
            const oldKey = imageKey(image);
            const response = await fetch("/images/addImg", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    donna: state.donnaId,
                    src: image.src,
                    origin: image.origin
                })
            });
            if (!response.ok) throw new Error(`Impossibile preparare ${image.origin}.`);
            const gallery = await response.json();
            image.id = gallery.id;
            if (state.previewKey === oldKey) state.previewKey = imageKey(image);
        }
    };

    const saveImages = async () => {
        if (!annuncioId || !state.donnaId) return showError("Salva prima le informazioni dell'annuncio.");

        toggleLoader();
        try {
            if (!state.images.length) {
                const savedInfo = await saveInfo({ redirect: false, showSuccess: false, manageLoader: false });
                if (!savedInfo) throw new Error("Impossibile aggiornare l'anteprima Moscarossa.");
                ShowAlert("lblSaved");
                return;
            }

            await registerPendingGalleryImages();
            const formData = new FormData();

            for (const image of state.images) {
                const isNewImage = Boolean(image.file);
                const blob = image.file || await fetch(galleryImageSrc(image)).then((response) => {
                    if (!response.ok) throw new Error("Impossibile leggere una delle immagini esistenti.");
                    return response.blob();
                });
                formData.append("imgs", blob, image.origin || `moscarossa-${image.id}.jpg`);
                formData.append("origin", image.id);
                formData.append("hidden", false);
                formData.append("isNew", isNewImage);
            }

            const response = await fetch(
                `/images/update?phone=${encodeURIComponent(state.phone)}&ann=${encodeURIComponent(annuncioId)}&panel=${PANEL}`,
                { method: "POST", credentials: "same-origin", body: formData }
            );
            if (response.status === 413) {
                throw new Error("Moscarossa accetta massimo 20 immagini da 5 MB ciascuna.");
            }
            if (response.status !== 201) throw new Error("Impossibile salvare le immagini Moscarossa.");

            const savedInfo = await saveInfo({ redirect: false, showSuccess: false, manageLoader: false });
            if (!savedInfo) throw new Error("Le foto sono salvate, ma non è stato possibile salvare l'anteprima.");

            ShowAlert("lblSaved");
            window.setTimeout(() => window.location.reload(), 350);
        } catch (error) {
            showError(error.message);
        } finally {
            toggleLoader();
        }
    };

    const loadAdvertisement = async () => {
        toggleLoader();
        try {
            const response = await fetch("/annuncio/getByID", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: annuncioId, panel: PANEL })
            });
            if (!response.ok) throw new Error("Impossibile caricare l'annuncio Moscarossa.");

            const ad = await response.json();
            const options = parseMoscarossaNote(ad.note);
            state.donnaId = ad.donnaID;
            state.phone = `${ad.phone || ""}`;
            document.querySelector("#annuncioID").value = ad.id;
            document.querySelector("#donnaID").value = ad.donnaID;
            document.querySelector("#moscarossaPageTitle").textContent = "Gestisci Annuncio Moscarossa";

            setValue("categorie", ad.categorie || "DONNAUOMO");
            setValue("name", ad.name);
            setValue("title", ad.title);
            setValue("description", ad.description);
            setValue("phone", ad.phone);
            setValue("age", ad.age);
            setValue("city", ad.city);
            setValue("location", options.zone || ad.location);
            setValue("zoneId", options.zoneId);
            setValue("address", options.address);
            setValue("zoneDetail", options.zoneDetail);
            setValue("latitude", options.latitude);
            setValue("longitude", options.longitude);
            setValue("website", options.website);
            setChecked("whatsapp", ad.hasWhatapp);
            setChecked("telegram", ad.hasTelegram);
            setChecked("airConditioned", options.airConditioned);

            state.images = (Array.isArray(ad.images) ? ad.images : [])
                .filter((image) => !image.isHidden)
                .slice(0, MAX_IMAGES)
                .map((image) => ({
                    id: image.id,
                    src: image.src,
                    origin: image.origin || `moscarossa-${image.id}.jpg`
                }));
            state.previewKey = options.previewGalleryId
                ? `gallery-${options.previewGalleryId}`
                : (state.images.length ? imageKey(state.images[0]) : "");
            if (!state.images.some((image) => imageKey(image) === state.previewKey) && state.images.length) {
                state.previewKey = imageKey(state.images[0]);
            }
            renderImages();
            setFormEditing(false);
        } catch (error) {
            showError(error.message);
        } finally {
            toggleLoader();
        }
    };

    infoForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveInfo({ redirect: isNew });
    });
    editInfoButton.addEventListener("click", () => setFormEditing(true));
    document.querySelector("#moscarossaImages").addEventListener("change", (event) => {
        addSelectedImages(event.target.files);
        event.target.value = "";
    });
    document.querySelector("#moscarossaSaveImages").addEventListener("click", saveImages);

    if (isNew) {
        setFormEditing(true);
        document.querySelector("#moscarossaImages").disabled = true;
        document.querySelector("#moscarossaNewAdImageHelp").style.display = "block";
    } else if (Number.isFinite(annuncioId)) {
        setFormEditing(false);
        loadAdvertisement();
    } else {
        showError("Identificativo annuncio Moscarossa non valido.");
    }
})();
