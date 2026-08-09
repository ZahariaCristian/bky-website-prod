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
        cityId: "",
        images: [],
        removedImages: [],
        showingRemovedImages: false,
        previewKey: "",
        cropper: null,
        cropImageKey: ""
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
    const normalizeCityName = (value) => clean(value).normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/gi, " ")
        .trim()
        .toLowerCase();
    const showError = (message) => ShowAlert("custom", message, 5000);
    const imageKey = (image) => image.id ? `gallery-${image.id}` : image.key;
    const infoForm = document.querySelector("#moscarossaInfoForm");
    const editInfoButton = document.querySelector("#moscarossaEditInfo");
    const saveInfoButton = document.querySelector("#moscarossaSaveInfo");
    const updateAllButton = document.querySelector("#moscarossaUpdateAll");
    const updateAllSection = document.querySelector("#moscarossaUpdateAllSection");
    const verifyPhoneButton = document.querySelector("#verify-button");
    const verifyPhoneLabel = document.querySelector("#test-label");
    const cityLookup = $("#moscarossaCityId");
    const galleryImageSrc = (image) => {
        if (!image?.id || !image.src || !image.src.includes("?")) return image?.src || "";
        if (/[?&]id=/.test(image.src)) return image.src;
        return `${image.src}&id=${encodeURIComponent(image.id)}`;
    };

    const selectedCityId = () => {
        const value = clean(field("cityId")?.value);
        return value.startsWith("legacy:") ? "" : value;
    };

    const setCitySelection = (cityId, cityName) => {
        const name = clean(cityName);
        const id = clean(cityId) || (name ? `legacy:${name}` : "");
        state.cityId = clean(cityId);
        setValue("city", name);

        if (cityLookup.data("select2")) {
            cityLookup.select2("data", id && name ? { id, text: name } : null);
        } else {
            cityLookup.val(id);
        }
    };

    const initializeCityLookup = () => {
        if (!cityLookup.length || typeof $.fn.select2 === "undefined") {
            showError("Il controllo Comune Moscarossa non è disponibile.");
            return;
        }

        cityLookup.select2({
            width: "100%",
            placeholder: "Scrivi una città/comune",
            allowClear: true,
            minimumInputLength: 2,
            maximumInputLength: 80,
            formatInputTooShort: () => "Inserisci almeno 2 caratteri",
            formatSearching: () => "Ricerca in corso...",
            formatNoMatches: () => "Nessun Comune trovato",
            ajax: {
                url: "/annuncio/moscarossaLocations",
                dataType: "json",
                quietMillis: 350,
                data: (term) => ({ term, idAccompa: "0" }),
                results: (payload) => ({
                    results: (Array.isArray(payload?.results) ? payload.results : [])
                        .filter((item) => item?.id && item?.text)
                        .map((item) => ({ id: `${item.id}`, text: clean(item.text) }))
                }),
                params: {
                    error: (xhr) => {
                        let message = "Impossibile caricare i Comuni Moscarossa.";
                        try {
                            message = xhr.responseJSON?.error || JSON.parse(xhr.responseText || "{}").error || message;
                        } catch {
                            // Keep the user-facing fallback when the proxy returned non-JSON content.
                        }
                        showError(message);
                    }
                }
            }
        });

        cityLookup.on("change", () => {
            const selection = cityLookup.select2("data");
            const nextId = clean(selection?.id);
            const previousId = state.cityId;
            state.cityId = nextId.startsWith("legacy:") ? "" : nextId;
            setValue("city", selection?.text || "");

            if (saveInfoButton.disabled) setFormEditing(true);

            if (previousId && state.cityId && previousId !== state.cityId) {
                setValue("location", "");
                setValue("zoneId", "");
            }
        });

        cityLookup.on("select2-opening", () => {
            if (saveInfoButton.disabled) setFormEditing(true);
        });
    };

    const resolveLegacyCitySelection = async (cityName) => {
        const city = clean(cityName);
        if (!city || selectedCityId()) return;

        try {
            const response = await fetch(
                `/annuncio/moscarossaLocations?term=${encodeURIComponent(city)}&idAccompa=0`,
                { credentials: "same-origin" }
            );
            if (!response.ok) return;
            const payload = await response.json();
            const target = normalizeCityName(city);
            const results = Array.isArray(payload?.results) ? payload.results : [];
            const match = results.find((item) => normalizeCityName(item?.text) === target)
                || results.find((item) => normalizeCityName(item?.text).startsWith(`${target} `));
            if (match?.id) setCitySelection(`${match.id}`, clean(match.text));
        } catch (error) {
            console.warn("Moscarossa Comune legacy resolution failed:", error.message);
        }
    };

    const setFormEditing = (editing) => {
        infoForm.querySelectorAll("input:not([type='hidden']), textarea, select").forEach((control) => {
            control.disabled = !editing;
        });
        verifyPhoneButton.disabled = !editing || verifyPhoneButton.dataset.verified === "true";
        saveInfoButton.disabled = !editing;
        editInfoButton.style.display = editing || isNew ? "none" : "block";
        updateAllSection.style.display = isNew ? "none" : "block";
        if (cityLookup.data("select2")) {
            // Comune remains interactive; opening it automatically activates information editing.
            cityLookup.select2("enable", true);
        }
    };

    const setPhoneVerificationState = (status) => {
        const verified = status === "verified";
        const loading = status === "loading";
        verifyPhoneButton.dataset.verified = verified ? "true" : "false";
        verifyPhoneButton.className = verified ? "btn btn-success" : "btn btn-secondary";
        verifyPhoneButton.innerHTML = verified
            ? "<i class='fa fa-check'></i>"
            : "<span><i class='fa fa-arrow-right'></i></span>";
        verifyPhoneButton.disabled = verified || loading || saveInfoButton.disabled;
        verifyPhoneLabel.textContent = verified ? "Verificato" : (loading ? "In corso.." : "Verifica");
    };

    const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    const postPhoneOperation = (operation) => fetch("/contactVerify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation })
    });

    const waitForPhoneOperation = async (operation) => {
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const response = await postPhoneOperation(operation);
            if (response.status !== 202) return response;
            await delay(3000);
        }
        throw new Error("La verifica telefonica non ha risposto in tempo.");
    };

    const verifyPhone = async () => {
        const phone = clean(field("phone")?.value);
        const city = clean(field("city")?.value);
        if (!/^\d+$/.test(phone)) return showError("Il numero di telefono non è valido.");
        if (!city) return showError("Inserisci il Comune prima di verificare il telefono.");

        const operation = {
            id: btoa(`${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]/gi, "").slice(-16),
            action: "check",
            status: false,
            approved: false,
            phone,
            city
        };

        setPhoneVerificationState("loading");
        try {
            let response = await postPhoneOperation(operation);
            if (response.status !== 204) response = await waitForPhoneOperation(operation);
            if (response.status === 204) return setPhoneVerificationState("verified");

            let firstAttempt = true;
            while (response.status === 402 || response.status === 403) {
                const code = window.prompt(firstAttempt
                    ? "Inserisci il codice di verifica:"
                    : "Codice errato. Inserisci di nuovo il codice di verifica:");
                if (code === null) {
                    await postPhoneOperation({ ...operation, code: "cancel" });
                    setPhoneVerificationState("idle");
                    return;
                }

                const operationWithCode = { ...operation, code: clean(code) };
                await postPhoneOperation(operationWithCode);
                response = await waitForPhoneOperation(operationWithCode);
                if (response.status === 204) return setPhoneVerificationState("verified");
                firstAttempt = false;
            }

            throw new Error("Non è stato possibile verificare il numero di telefono.");
        } catch (error) {
            setPhoneVerificationState("idle");
            showError(error.message);
        }
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
            cityId: selectedCityId(),
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
        if (!info.moscarossa.cityId) return "Seleziona il Comune dai risultati Moscarossa.";
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

    const updateAllAdvertisements = async () => {
        const info = collectInfo();
        const validationError = validateInfo(info);
        if (validationError) return showError(validationError);
        if (!annuncioId) return showError("Salva prima le informazioni dell'annuncio.");
        if (!window.confirm("Modificare tutti gli annunci Moscarossa già pubblicati?")) return;

        updateAllButton.disabled = true;
        toggleLoader();
        try {
            const response = await fetch("/annuncio/updateAllDataSchedule", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ info, panel: PANEL, id: annuncioId })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Impossibile modificare tutti gli annunci Moscarossa.");
            }
            ShowAlert("lblSaved");
            window.setTimeout(() => window.location.reload(), 300);
        } catch (error) {
            updateAllButton.disabled = false;
            showError(error.message);
        } finally {
            toggleLoader();
        }
    };

    const markImagesDirty = () => {
        document.querySelector("#moscarossaSaveImages").disabled = false;
    };

    const createImageAction = ({ icon, className, title, disabled = false, onClick }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `btn ${className}`;
        button.disabled = disabled;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.innerHTML = `<i class="fa ${icon}"></i>`;
        button.addEventListener("click", onClick);
        return button;
    };

    const replaceImageBlob = (image, blob) => {
        if (image.src?.startsWith("blob:")) URL.revokeObjectURL(image.src);
        image.file = blob;
        image.src = URL.createObjectURL(blob);
        markImagesDirty();
        renderImages();
    };

    const toggleApplyPhone = async (image) => {
        if (!image?.id) return showError("Salva prima questa immagine.");
        const nextValue = !Boolean(image.applyPhone);
        const response = await fetch("/images/updateImgPhone", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: image.id, applyPhone: nextValue })
        });
        if (!response.ok) throw new Error("Impossibile aggiornare l'immagine del telefono.");
        image.applyPhone = nextValue;
        renderImages();
    };

    const rotateImageLeft = async (image) => {
        const response = await fetch(galleryImageSrc(image));
        if (!response.ok) throw new Error("Impossibile leggere l'immagine da ruotare.");
        const source = await createImageBitmap(await response.blob());
        const canvas = document.createElement("canvas");
        canvas.width = source.height;
        canvas.height = source.width;
        const context = canvas.getContext("2d");
        context.translate(0, canvas.height);
        context.rotate(-Math.PI / 2);
        context.drawImage(source, 0, 0);
        source.close?.();
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .92));
        if (!blob) throw new Error("Impossibile ruotare l'immagine.");
        replaceImageBlob(image, blob);
    };

    const closeCropModal = () => {
        state.cropper?.destroy();
        state.cropper = null;
        state.cropImageKey = "";
        const modal = document.querySelector("#customModal");
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    };

    const openCropModal = (image) => {
        if (typeof Cropper !== "function") return showError("L'editor immagini non è disponibile.");
        const modal = document.querySelector("#customModal");
        const modalImage = document.querySelector("#modalImage");
        state.cropper?.destroy();
        state.cropImageKey = imageKey(image);
        modalImage.src = galleryImageSrc(image);
        modal.style.display = "block";
        modal.setAttribute("aria-hidden", "false");
        modalImage.onload = () => {
            state.cropper = new Cropper(modalImage, {
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                aspectRatio: 2 / 3
            });
        };
    };

    const saveCroppedImage = () => {
        const image = state.images.find((entry) => imageKey(entry) === state.cropImageKey);
        if (!image || !state.cropper) return closeCropModal();
        const canvas = state.cropper.getCroppedCanvas({ imageSmoothingQuality: "high" });
        canvas.toBlob((blob) => {
            if (!blob) return showError("Impossibile salvare il ritaglio.");
            replaceImageBlob(image, blob);
            closeCropModal();
        }, "image/jpeg", .92);
    };

    const createImageCard = (image, index, removed = false) => {
            const key = imageKey(image);
            const card = document.createElement("div");
            card.className = `pic-panel moscarossa-image-card${!removed && state.previewKey === key ? " is-preview" : ""}`;
            card.dataset.key = key;
            card.dataset.id = image.id || "";
            card.dataset.origin = image.origin || "";

            const actions = document.createElement("div");
            actions.className = "pic-operations moscarossa-image-actions";

            if (removed) {
                actions.appendChild(createImageAction({
                    icon: "fa-times",
                    className: "btn-danger",
                    title: "Elimina definitivamente",
                    onClick: () => handleImageAction("delete", index, true)
                }));
                actions.appendChild(createImageAction({
                    icon: "fa-mail-reply",
                    className: "btn-success",
                    title: "Ripristina immagine",
                    onClick: () => handleImageAction("restore", index, true)
                }));
            } else {
                actions.appendChild(createImageAction({
                    icon: "fa-arrow-left",
                    className: "btn-success img-move-btn",
                    title: "Sposta a sinistra",
                    disabled: index === 0,
                    onClick: () => handleImageAction("left", index)
                }));
                actions.appendChild(createImageAction({
                    icon: "fa-times",
                    className: "btn-danger",
                    title: "Rimuovi immagine",
                    onClick: () => handleImageAction("remove", index)
                }));
                actions.appendChild(createImageAction({
                    icon: "fa-phone",
                    className: image.applyPhone ? "btn-primary" : "btn-default",
                    title: image.applyPhone ? "Immagine usata sul telefono" : "Usa sul telefono",
                    disabled: !image.id,
                    onClick: async () => {
                        try {
                            await toggleApplyPhone(image);
                        } catch (error) {
                            showError(error.message);
                        }
                    }
                }));
                actions.appendChild(createImageAction({
                    icon: "fa-edit",
                    className: "btn-primary",
                    title: "Ritaglia immagine",
                    onClick: () => openCropModal(image)
                }));
                actions.appendChild(createImageAction({
                    icon: "fa-rotate-left",
                    className: "btn-primary",
                    title: "Ruota a sinistra",
                    onClick: async () => {
                        try {
                            await rotateImageLeft(image);
                        } catch (error) {
                            showError(error.message);
                        }
                    }
                }));
            }

            const download = document.createElement("a");
            download.className = "btn btn-primary";
            download.href = galleryImageSrc(image);
            download.target = "_blank";
            download.rel = "noopener";
            download.download = image.origin || "moscarossa-image";
            download.title = "Scarica immagine";
            download.setAttribute("aria-label", "Scarica immagine");
            download.innerHTML = '<i class="fa fa-arrow-down" style="color:white"></i>';
            actions.appendChild(download);

            if (!removed) {
                actions.appendChild(createImageAction({
                    icon: "fa-arrow-right",
                    className: "btn-success img-move-btn",
                    title: "Sposta a destra",
                    disabled: index === state.images.length - 1,
                    onClick: () => handleImageAction("right", index)
                }));
            }
            card.appendChild(actions);

            const pictureWrapper = document.createElement("div");
            pictureWrapper.className = "pic-wrapper";
            if (!removed) {
                pictureWrapper.tabIndex = 0;
                pictureWrapper.setAttribute("role", "button");
                pictureWrapper.title = state.previewKey === key
                    ? "Immagine di anteprima"
                    : "Imposta come immagine di anteprima";
                const selectPreview = () => {
                    if (state.previewKey === key) return;
                    state.previewKey = key;
                    renderImages();
                    markImagesDirty();
                };
                pictureWrapper.addEventListener("click", selectPreview);
                pictureWrapper.addEventListener("keydown", (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    selectPreview();
                });
            }

            const picture = document.createElement("img");
            picture.src = galleryImageSrc(image);
            picture.alt = `Foto Moscarossa ${index + 1}`;
            pictureWrapper.appendChild(picture);
            card.appendChild(pictureWrapper);
            return card;
    };

    const renderImages = () => {
        const activeGrid = document.querySelector("#moscarossaImageGrid");
        const removedGrid = document.querySelector("#moscarossaRemovedImageGrid");
        const activeContainer = document.querySelector("#moscarossaActiveImages");
        const removedContainer = document.querySelector("#moscarossaRemovedImages");
        const showRemovedButton = document.querySelector("#moscarossaShowRemoved");
        activeGrid.innerHTML = "";
        removedGrid.innerHTML = "";

        state.images.forEach((image, index) => activeGrid.appendChild(createImageCard(image, index)));
        state.removedImages.forEach((image, index) => removedGrid.appendChild(createImageCard(image, index, true)));

        if (!state.removedImages.length) state.showingRemovedImages = false;
        activeContainer.style.display = state.showingRemovedImages ? "none" : "flex";
        removedContainer.style.display = state.showingRemovedImages ? "flex" : "none";
        showRemovedButton.disabled = state.removedImages.length === 0;
        showRemovedButton.classList.toggle("btn-success", !state.showingRemovedImages);
        showRemovedButton.classList.toggle("btn-warning", state.showingRemovedImages);
        showRemovedButton.title = state.showingRemovedImages ? "Mostra immagini attive" : "Mostra immagini rimosse";
        showRemovedButton.setAttribute("aria-label", showRemovedButton.title);
    };

    const requestImageState = async (url, image, fallbackMessage) => {
        if (!image?.id) return;
        const response = await fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: image.id })
        });
        if (!response.ok) throw new Error(fallbackMessage);
    };

    const handleImageAction = async (action, index, removed = false) => {
        const collection = removed ? state.removedImages : state.images;
        const image = collection[index];
        if (!image) return;

        try {
            if (action === "left" && index > 0) {
                [state.images[index - 1], state.images[index]] = [state.images[index], state.images[index - 1]];
            } else if (action === "right" && index < state.images.length - 1) {
                [state.images[index + 1], state.images[index]] = [state.images[index], state.images[index + 1]];
            } else if (action === "remove") {
                if (!window.confirm("Rimuovere questa immagine?")) return;
                if (image.id) {
                    await requestImageState("/images/romoveImg", image, "Impossibile rimuovere l'immagine.");
                    state.removedImages.push({ ...image, isHidden: true });
                } else if (image.file) {
                    URL.revokeObjectURL(image.src);
                }
                state.images.splice(index, 1);
                if (state.previewKey === imageKey(image)) {
                    state.previewKey = state.images.length ? imageKey(state.images[0]) : "";
                }
            } else if (action === "restore" && removed) {
                if (state.images.length >= MAX_IMAGES) {
                    return showError(`Moscarossa accetta al massimo ${MAX_IMAGES} immagini attive.`);
                }
                await requestImageState("/images/restoreImg", image, "Impossibile ripristinare l'immagine.");
                state.removedImages.splice(index, 1);
                state.images.push({ ...image, isHidden: false });
                if (!state.previewKey) state.previewKey = imageKey(image);
            } else if (action === "delete" && removed) {
                if (!window.confirm("Eliminare definitivamente questa immagine?")) return;
                await requestImageState("/images/removeDefImg", image, "Impossibile eliminare definitivamente l'immagine.");
                state.removedImages.splice(index, 1);
            }

            renderImages();
            markImagesDirty();
        } catch (error) {
            showError(error.message);
        }
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

        if (!accepted.length || available <= 0) return;
        if (!state.previewKey && state.images.length) state.previewKey = imageKey(state.images[0]);
        state.showingRemovedImages = false;
        renderImages();
        markImagesDirty();
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
            setCitySelection(options.cityId, ad.city);
            await resolveLegacyCitySelection(ad.city);
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
            setPhoneVerificationState(ad.isPhoneChecked ? "verified" : "idle");

            const galleryImages = (Array.isArray(ad.images) ? ad.images : []).map((image) => ({
                    id: image.id,
                    src: image.src,
                    origin: image.origin || `moscarossa-${image.id}.jpg`,
                    applyPhone: image.applyPhone === true || image.applyPhone === 1 || image.applyPhone === "1",
                    crop: image.crop || "",
                    isHidden: image.isHidden === true || image.isHidden === 1 || image.isHidden === "1"
                }));
            state.images = galleryImages.filter((image) => !image.isHidden).slice(0, MAX_IMAGES);
            state.removedImages = galleryImages.filter((image) => image.isHidden);
            state.showingRemovedImages = false;
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

    const importPublicAdvertisement = async () => {
        const input = document.querySelector("#link-to-scrape");
        const url = clean(input?.value);
        if (!url) return showError("Inserisci prima il link pubblico Moscarossa.");

        toggleLoader();
        try {
            const response = await fetch("/annuncio/scrapeMoscarossa", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, panel: PANEL })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Impossibile importare l'annuncio Moscarossa.");
            }
            if (!payload.id) throw new Error("Moscarossa non ha restituito un annuncio valido.");
            window.location.href = `/annuncio.html?edit=${encodeURIComponent(payload.id)}&panel=${PANEL}`;
        } catch (error) {
            showError(error.message);
        } finally {
            toggleLoader();
        }
    };

    const loadPreviousAdvertisements = async () => {
        const select = document.querySelector("#select2_3");
        if (!select) return;
        try {
            const response = await fetch("/annuncio/getDonne", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error("Impossibile caricare gli ultimi annunci.");
            const payload = await response.json();
            (payload.donne || []).forEach((donna) => {
                const latestAdvertisement = [...(donna.tblAnnuncis || [])]
                    .sort((left, right) => Number(right.id) - Number(left.id))[0];
                if (!latestAdvertisement) return;
                const option = document.createElement("option");
                option.value = latestAdvertisement.id;
                option.textContent = `${clean(donna.name)} (${clean(donna.phone)})`;
                option.selected = Number(latestAdvertisement.id) === annuncioId;
                select.appendChild(option);
            });
            if (typeof $.fn.select2 === "function" && !$(select).data("select2")) {
                $(select).select2({ width: "100%" });
            }
        } catch (error) {
            showError(error.message);
        }
    };

    const openSelectedAdvertisement = () => {
        const selectedId = clean(document.querySelector("#select2_3")?.value);
        if (!selectedId) return showError("Seleziona prima una cliente.");
        window.location.href = `/annuncio.html?edit=${encodeURIComponent(selectedId)}&panel=${PANEL}`;
    };

    infoForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await saveInfo({ redirect: isNew });
    });
    updateAllButton.addEventListener("click", updateAllAdvertisements);
    editInfoButton.addEventListener("click", () => setFormEditing(true));
    verifyPhoneButton.addEventListener("click", verifyPhone);
    field("phone").addEventListener("input", () => setPhoneVerificationState("idle"));
    document.querySelector("#moscarossaImages").addEventListener("change", (event) => {
        addSelectedImages(event.target.files);
        event.target.value = "";
    });
    document.querySelector("#moscarossaSaveImages").addEventListener("click", saveImages);
    document.querySelector("#caricalink-button").addEventListener("click", importPublicAdvertisement);
    document.querySelector("#link-to-scrape").addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        importPublicAdvertisement();
    });
    document.querySelector("#caricaphone-button").addEventListener("click", openSelectedAdvertisement);
    document.querySelector("#select2_3").addEventListener("change", (event) => {
        if (event.target.value) openSelectedAdvertisement();
    });
    document.querySelector("#moscarossaShowRemoved").addEventListener("click", () => {
        if (!state.removedImages.length) return;
        state.showingRemovedImages = !state.showingRemovedImages;
        renderImages();
    });
    document.querySelector("#closeModalButton").addEventListener("click", closeCropModal);
    document.querySelector("#saveCropButton").addEventListener("click", saveCroppedImage);
    document.querySelector("#customModal").addEventListener("click", (event) => {
        if (event.target.id === "customModal") closeCropModal();
    });

    const imageDropZone = document.querySelector("#moscarossaActiveImages");
    const dragOverlay = imageDropZone.querySelector(".dragHere");
    const hideDragOverlay = () => { dragOverlay.style.display = "none"; };
    ["dragenter", "dragover"].forEach((eventName) => {
        imageDropZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            if (!document.querySelector("#moscarossaImages").disabled) dragOverlay.style.display = "block";
        });
    });
    imageDropZone.addEventListener("dragleave", (event) => {
        if (!imageDropZone.contains(event.relatedTarget)) hideDragOverlay();
    });
    imageDropZone.addEventListener("drop", (event) => {
        event.preventDefault();
        hideDragOverlay();
        if (document.querySelector("#moscarossaImages").disabled) {
            return showError("Salva prima le informazioni dell'annuncio, quindi aggiungi le immagini.");
        }
        addSelectedImages(event.dataTransfer.files);
    });

    initializeCityLookup();
    loadPreviousAdvertisements();

    if (isNew) {
        setFormEditing(true);
        document.querySelector("#moscarossaImages").disabled = true;
        document.querySelector("#moscarossaSaveImages").disabled = true;
        document.querySelector("#moscarossaNewAdImageHelp").style.display = "block";
    } else if (Number.isFinite(annuncioId)) {
        setFormEditing(false);
        loadAdvertisement();
    } else {
        showError("Identificativo annuncio Moscarossa non valido.");
    }
})();
