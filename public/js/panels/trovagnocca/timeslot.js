// Change background-color when choose Toplist
$(".promoType>ul>li").on("click", (me) => {
    $("#wizar-body").css("background-color", $(me.target).css("background-color"));
})

function safeEnableScheduleUpdate() {
    if (typeof enableScheduleUpdate === "function") {
        enableScheduleUpdate();
    }
}

function markSchedulePanelEdited(node) {
    const panel = node?.closest ? node.closest(".newpost-panel") : null;
    if (!panel) return;
    $(panel).attr("data-state", "EDIT");
    $(panel).data("state", "EDIT");
}

function setDefaultDatetime(timeInput) {
    if (!timeInput) return;
    timeInput.value = new Date().toLocaleTimeString("it", {
        timeZone: "Europe/Rome",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const TROVAGNOCCA_GOLD_SLOTS = [
    { group: "MATTINA", label: "Mattina", slots: ["06:00-09:00", "09:00-12:00"] },
    { group: "POMERIGGIO", label: "Pomeriggio", slots: ["12:00-15:00", "15:00-18:00"] },
    { group: "SERA", label: "Sera", slots: ["18:00-21:00", "21:00-00:00"] },
    { group: "NOTTE", label: "Notte", slots: ["00:00-06:00"] },
];

const TROVAGNOCCA_TURBO_OPTIONS = [
    { value: "307", text: "1 Ora" },
    { value: "308", text: "2 Ore" }
];

const normalizeGoldGroup = (value = "") => {
    const text = `${value || ""}`.toUpperCase();
    if (text.includes("MATT")) return "MATTINA";
    if (text.includes("POMER")) return "POMERIGGIO";
    if (text.includes("SERA")) return "SERA";
    if (text.includes("NOTT")) return "NOTTE";
    return "";
};

const goldGroupForHour = (hour) => {
    if (hour >= 6 && hour < 12) return "MATTINA";
    if (hour >= 12 && hour < 18) return "POMERIGGIO";
    if (hour >= 18 && hour < 24) return "SERA";
    return "NOTTE";
};

const expandGoldRange = (period = "") => {
    const match = `${period || ""}`.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) return [];

    const startHour = Number(match[1]) % 24;
    const endHour = Number(match[3]) % 24;
    const slots = [];
    let hour = startHour;
    let guard = 0;

    while (guard < 24) {
        const nextHour = (hour + 1) % 24;
        slots.push({
            group: goldGroupForHour(hour),
            slot: `${String(hour).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`
        });
        hour = nextHour;
        guard++;
        if (hour === endHour) break;
    }

    return slots;
};

const parseGoldPeriod = (period = "") => {
    try {
        const parsed = JSON.parse(period || "[]");
        if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
                group: normalizeGoldGroup(item.group),
                slots: Array.isArray(item.slots) ? item.slots : []
            })).filter((item) => item.group && item.slots.length);
        }
    } catch {
        // Legacy range format is handled below.
    }

    const grouped = {};
    expandGoldRange(period).forEach(({ group, slot }) => {
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(slot);
    });
    return Object.keys(grouped).map((group) => ({ group, slots: grouped[group] }));
};

const getGoldPeriodFromPanel = (panel) => {
    const groups = [];
    TROVAGNOCCA_GOLD_SLOTS.forEach((group) => {
        const slots = Array.from(panel.querySelectorAll(`.gold-slot-input[data-group="${group.group}"]:checked`))
            .map((input) => input.value);
        if (slots.length) groups.push({ group: group.group, slots });
    });
    return groups.length ? JSON.stringify(groups) : "";
};

const buildTurboPeriod = (value = "") => {
    const option = TROVAGNOCCA_TURBO_OPTIONS.find((item) => item.value === `${value || ""}`) || TROVAGNOCCA_TURBO_OPTIONS[0];
    return JSON.stringify({
        productId: "301",
        durationProductId: option.value,
        label: option.text
    });
};

const parseTurboPeriod = (period = "") => {
    try {
        const parsed = JSON.parse(period || "{}");
        if (parsed && parsed.durationProductId) return `${parsed.durationProductId}`;
        if (parsed && parsed.productId && `${parsed.productId}` !== "301") return `${parsed.productId}`;
    } catch {
        // Legacy/plain values fall through.
    }
    const text = `${period || ""}`.trim();
    return text || TROVAGNOCCA_TURBO_OPTIONS[0].value;
};

const createTurboOptionSelect = (selected = "") => {
    const select = document.createElement("select");
    select.className = "form-control turbo-option-select";
    TROVAGNOCCA_TURBO_OPTIONS.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.text;
        if (`${selected || ""}` === item.value) option.selected = true;
        select.appendChild(option);
    });
    if (!select.value && TROVAGNOCCA_TURBO_OPTIONS[0]) {
        select.value = TROVAGNOCCA_TURBO_OPTIONS[0].value;
    }
    select.addEventListener("change", () => {
        markSchedulePanelEdited(select);
        safeEnableScheduleUpdate();
    });
    return select;
};

const getTurboOptionFromPanel = (panel) => {
    return panel?.querySelector(".turbo-option-select")?.value || TROVAGNOCCA_TURBO_OPTIONS[0]?.value || "";
};

const getSingleGoldPeriodsFromPanel = (panel) => {
    const periods = [];
    TROVAGNOCCA_GOLD_SLOTS.forEach((group) => {
        panel.querySelectorAll(`.gold-slot-input[data-group="${group.group}"]:checked`).forEach((input) => {
            periods.push(JSON.stringify([{
                group: group.group,
                slots: [input.value]
            }]));
        });
    });
    return periods;
};

const applyGoldPeriodToPanel = (panel, period) => {
    const groups = parseGoldPeriod(period);
    const selected = new Set();
    groups.forEach((group) => {
        group.slots.forEach((slot) => selected.add(`${group.group}|${slot}`));
    });

    panel.querySelectorAll(".gold-slot-input").forEach((input) => {
        input.checked = selected.has(`${input.dataset.group}|${input.value}`);
    });
};

const createGoldSlotsSelector = () => {
    const wrapper = document.createElement("div");
    wrapper.className = "gold-slots";

    TROVAGNOCCA_GOLD_SLOTS.forEach((group) => {
        const groupBox = document.createElement("div");
        groupBox.className = "gold-slot-group";

        const title = document.createElement("strong");
        title.textContent = group.label;
        groupBox.appendChild(title);

        const slotsBox = document.createElement("div");
        slotsBox.className = "gold-slot-options";

        group.slots.forEach((slot) => {
            const id = `gold_${group.group}_${slot.replace(/[^0-9]/g, "")}_${Math.random().toString(36).slice(2)}`;
            const label = document.createElement("label");
            label.className = "gold-slot-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "gold-slot-input";
            checkbox.id = id;
            checkbox.value = slot;
            checkbox.dataset.group = group.group;
            checkbox.addEventListener("change", () => {
                markSchedulePanelEdited(checkbox);
                safeEnableScheduleUpdate();
            });

            const text = document.createElement("span");
            text.textContent = slot;

            label.appendChild(checkbox);
            label.appendChild(text);
            slotsBox.appendChild(label);
        });

        groupBox.appendChild(slotsBox);
        wrapper.appendChild(groupBox);
    });

    return wrapper;
};

var dropPromoDuration = (selected) => {
    var dropBox = document.createElement("select");
    var optionsStr = [
        { value: "1", text: "1 giorno" },
        { value: "3", text: "3 giorno" },
        { value: "7", text: "1 settimana" },
        { value: "28", text: "4 settimane" }
    ];

    optionsStr.forEach((x) => {
        var option = document.createElement("option");
        option.value = x.value;
        option.textContent = x.text;
        if (selected == x.value) {
            option.selected = true;
        }
        dropBox.appendChild(option);
    });
    return dropBox;
}

const getGoldSlotLabel = (slot = "") => {
    const match = `${slot || ""}`.match(/(\d{2}):00-(\d{2}):00/);
    if (!match) return `${slot || ""}`;
    return `${match[1]}:00 - ${match[2]}:00`;
};

const buildSingleGoldPeriod = (group, slot) => JSON.stringify([{
    group,
    slots: [slot]
}]);

const getGoldPeriodEntries = (period = "") => {
    return parseGoldPeriod(period)
        .flatMap((group) => group.slots.map((slot) => ({
            group: group.group,
            slot
        })))
        .filter((entry) => entry.group && entry.slot);
};

const getGoldPeriodFromTimeSlot = (timeslot) => {
    const group = timeslot?.dataset?.group || "";
    const slot = timeslot?.dataset?.slot || "";
    return group && slot ? buildSingleGoldPeriod(group, slot) : "";
};

const findPremiumTimeSlotForPeriod = (promoType, period) => {
    const entry = getGoldPeriodEntries(period)[0];
    if (!entry) return null;
    return document.querySelector(`.promo${promoType} .time-slot[data-group="${entry.group}"][data-slot="${entry.slot}"]`);
};

const rebuildPremiumTimeSlots = () => {
    ["1x1", "1x3", "1x7"].forEach((promoType) => {
        const container = document.querySelector(`.wpromo${promoType}`);
        if (!container) return;
        container.innerHTML = "";

        TROVAGNOCCA_GOLD_SLOTS.forEach((group) => {
            group.slots.forEach((slot) => {
                const id = `${promoType}_${group.group}_${slot.replace(/[^0-9]/g, "")}`;
                const timeslot = document.createElement("div");
                timeslot.className = "time-slot trovagnocca-time-slot";
                timeslot.dataset.group = group.group;
                timeslot.dataset.slot = slot;

                const checkboxWrapper = document.createElement("div");
                checkboxWrapper.className = "flex-checkbox";

                const checkbox = document.createElement("input");
                checkbox.id = id;
                checkbox.type = "checkbox";
                checkbox.className = "form-check-input";

                const label = document.createElement("label");
                label.htmlFor = id;
                label.className = "form-check-label";
                label.textContent = getGoldSlotLabel(slot);

                checkboxWrapper.appendChild(checkbox);
                checkboxWrapper.appendChild(label);
                timeslot.appendChild(checkboxWrapper);
                container.appendChild(timeslot);
            });
        });
    });
};

rebuildPremiumTimeSlots();


// Add sub timeslot when click checkbox
document.querySelectorAll(".time-slot").forEach((timeslot) => {
    const checkbox = timeslot.querySelector(".flex-checkbox input");
    if (!checkbox) return;
    checkbox.addEventListener("click", () => {
        safeEnableScheduleUpdate();
        if (!checkbox.checked) {
            $(timeslot).find(".posts").hide();
            $(timeslot).find(".posts").find(".newpost-panel").data("GCRecord", true);
        } else {
            const postsDiv = document.createElement("div");
            postsDiv.classList.add("posts");
            const postsListDiv = document.createElement("div");
            postsListDiv.classList.add("post-list");
            const newPostPanel = document.createElement("div");
            newPostPanel.classList.add("newpost-panel");

            // $(newPostPanel).data("duration", document.querySelector("select[name='duration']").value);
            // $(newPostPanel).attr("data-duration", document.querySelector("select[name='duration']").value);

            $(newPostPanel).data("duration", '1');
            $(newPostPanel).attr("data-duration", '1');

            // $(newPostPanel).data("cam", false);
            // $(newPostPanel).attr("data-cam", false);
            // $(newPostPanel).data("premium", false);
            // $(newPostPanel).attr("data-premium", false);

            // Add initialization for highlight and etichetta
            // $(newPostPanel).data("highlight", false);
            // $(newPostPanel).attr("data-highlight", false);
            // $(newPostPanel).data("etichetta", false);
            // $(newPostPanel).attr("data-etichetta", false);
            tmpID = tmpID + 1;
            $(newPostPanel).data("relativeID", tmpID);
            $(newPostPanel).attr("data-relativeID", tmpID);
            const newPostWrapper = document.createElement("div");
            newPostWrapper.classList.add("newpost-wrapper");

            const dateTime = document.createElement("label");
            // dateTime.innerText = `${$("#txtDate").val()}`;
            dateTime.innerHTML = currentDay;
            dateTime.classList.add("lblDateTime");

            const timeInput = document.createElement("input");
            timeInput.classList.add("form-control");
            timeInput.setAttribute("type", "time");
            setDefaultDatetime(timeInput);
            timeInput.addEventListener("change", () => {
                safeEnableScheduleUpdate();
                markSchedulePanelEdited(timeInput);
            });

            // Delete Button
            const delButton = document.createElement("button");
            delButton.type = "button";
            delButton.classList.add("btn");
            delButton.classList.add("btn-danger");
            delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;

            const picsButton = createPhotoButton();

            // Add button
            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.classList.add("btn");
            addButton.classList.add("btn-primary");
            addButton.innerHTML = "<b>+</b>";

            postsDiv.appendChild(postsListDiv);
            postsDiv.appendChild(addButton);
            newPostPanel.appendChild(newPostWrapper);
            postsListDiv.appendChild(newPostPanel);
            newPostWrapper.appendChild(dateTime);
            newPostWrapper.appendChild(timeInput);
            newPostWrapper.appendChild(delButton);
            newPostWrapper.appendChild(picsButton);
            timeSlotPanelOperations(postsDiv);
            timeslot.appendChild(postsDiv);
        }

    });
});

//When click Publish/Modify button
async function updateSchedule() {
    const annuncioID = $("#annuncioID").val();
    if (!annuncioID || annuncioID === "new" || Number.isNaN(parseInt(annuncioID, 10))) {
        return alert("Assicurati prima di salvare le informazioni dell'annuncio.");
    }
    if (typeof requestUpdate !== "function") {
        console.error("requestUpdate is not available for Trovagnocca schedule save.");
        return alert("La funzione di salvataggio non e ancora pronta. Ricarica la pagina e riprova.");
    }

    console.log(currentDay, 'updateSchedule function')
    pubs[currentDay] = await getSelectedDayPubs(currentDay);
    if (!pubs[currentDay].length) {
        return alert("Aggiungi almeno una fascia oraria prima di pubblicare.");
    }
    console.log(pubs, 'updateSchedule')
    requestUpdate(true);
};


// Get Schedule From Timeslot
function getSelectedDayPubs(currentDate) {
    let result = [];
    let i = 0;
    ["Free", "Turbo"].forEach(promoType => {
        document.querySelectorAll(`.promo${promoType} .newpost-panel`).forEach(panel => {
            if ($(panel).is(":hidden") && !$(panel).data("GCRecord")) return;
            let typeData = {};
            typeData.typeAnnuncio = promoType;
            typeData.typePeriodic = "Top";

            typeData.period = promoType === "Turbo" ? buildTurboPeriod(getTurboOptionFromPanel(panel)) : "";
            typeData.city = document.querySelector("input[name='city']").value

            let images = [];
            typeData.id = "";
            if ($(panel).data("id")) typeData.id = $(panel).data("id");
            if ($(panel).data("relativeID")) typeData.relativeID = $(panel).data("relativeID");
            if ($(panel).data("state")) typeData.state = $(panel).data("state");

            typeData.GCRecord = null;
            if ($(panel).data("GCRecord")) typeData.GCRecord = $(panel).data("GCRecord");
            if ($(panel).find(".btnPhoto").hasClass("btn-success")) {
                //     let i = -1;
                panel.querySelectorAll(".post-pic-wrapper").forEach(p => {
                    if (p.querySelector("button").classList.contains("btn-warning")) {
                        images.unshift({ galleria: $(p).find("input").data("id"), isAnteprima: true });
                        return images;
                    }
                    if (p.querySelector("input").checked) {
                        images.push({ galleria: $(p).find("input").data("id"), isAnteprima: false });
                        return images;
                    }
                });
            };

            // typeData.push({
            const timeInput = panel.querySelector("input[type='time']");
            const selectedTime = timeInput ? timeInput.value : "";
            if (!selectedTime) return;
            if (currentDate) {
                typeData.data = `${currentDate}T${selectedTime}:00.000Z`;
            } else {
                typeData.data = `${$("#txtDate").val()}T${selectedTime}:00.000Z`;
            }
            //     images,
            // });
            typeData.images = images;
            if (typeData.id == undefined) return;
            result[i] = typeData;
            i++;
        });
    });

    ["1x1", "1x3", "1x7"].forEach(promoType => {
        document.querySelectorAll(`.promo${promoType} .time-slot`).forEach(timeslot => {
            const checkbox = timeslot.querySelector(".flex-checkbox input");
            if (!checkbox?.checked && !$(timeslot).find(".newpost-panel").toArray().some((panel) => $(panel).data("GCRecord"))) return;

            const period = getGoldPeriodFromTimeSlot(timeslot);
            if (!period) return;

            timeslot.querySelectorAll(".newpost-panel").forEach(panel => {
                if ($(panel).is(":hidden") && !$(panel).data("GCRecord")) return;
                const timeInput = panel.querySelector("input[type='time']");
                const selectedTime = timeInput ? timeInput.value : "";
                if (!selectedTime) return;

                let typeData = {};
                typeData.typeAnnuncio = promoType;
                typeData.typePeriodic = "Top";
                typeData.period = period;
                typeData.city = document.querySelector("input[name='city']").value;

                let images = [];
                typeData.id = "";
                if ($(panel).data("id")) typeData.id = $(panel).data("id");
                if ($(panel).data("relativeID")) typeData.relativeID = $(panel).data("relativeID");
                if ($(panel).data("state")) typeData.state = $(panel).data("state");
                typeData.GCRecord = null;
                if ($(panel).data("GCRecord")) typeData.GCRecord = $(panel).data("GCRecord");

                if ($(panel).find(".btnPhoto").hasClass("btn-success")) {
                    panel.querySelectorAll(".post-pic-wrapper").forEach(p => {
                        if (p.querySelector("button").classList.contains("btn-warning")) {
                            images.unshift({ galleria: $(p).find("input").data("id"), isAnteprima: true });
                            return images;
                        }
                        if (p.querySelector("input").checked) {
                            images.push({ galleria: $(p).find("input").data("id"), isAnteprima: false });
                            return images;
                        }
                    });
                }

                typeData.data = `${currentDate || $("#txtDate").val()}T${selectedTime}:00.000Z`;
                typeData.images = images;
                if (typeData.id == undefined) return;
                result[i] = typeData;
                i++;
            });
        });
    });

    return result;
};

function loadDay(date) {
    clearPubsViews();
    console.log(date, 'load date timeslots')
    if (!pubs[date]) return;
    loadDayData(pubs[date]);
};

function clearPubsViews() {
    //document.querySelectorAll(".promoPanel .btn-danger").forEach(b => b.click());
    $(".btn-danger").parents(".time-slot").find(".form-check-input").click();
    $(".newpost-panel").remove();
    //$(".chkCam").prop("checked", false);
    //$(".chkPremium").prop("checked", false);
    // ["videochiamata", "premium"].forEach(s => {
    //     document.querySelector(`.${s}-promo input`).checked = false;
    // });
};

function loadDayData(pubs) {
    ["Free", "Turbo"].forEach(promoType => {
        pubs.filter((typer) => { if (typer.typeAnnuncio == promoType) return typer }, promoType).forEach(announcement => {
            console.log(announcement, 'announcement in loadDayData')
            if (announcement.status !== undefined && announcement.status !== "pending") return;
            announcement.time = announcement.data.split("T")[1].split(":00.")[0];

            const addButton = document.querySelector(`.promo${promoType} .free-add-schedule, .promo${promoType} .turbo-add-schedule, .promo${promoType} .top-add-schedule`);
            if (promoType === "Turbo") {
                addTurboSchedule(addButton);
            } else {
                addFreeSchedule(addButton);
            }

            const currentPanel = $(`.promo${promoType} .newpost-panel:last-child`);
            currentPanel.attr("data-id", announcement.id);
            currentPanel.data("id", announcement.id);
            currentPanel.attr("data-state", announcement.state);
            currentPanel.data("state", announcement.state);
            currentPanel.attr("data-city", announcement.city);
            currentPanel.data("city", announcement.city);
            currentPanel.find("input[type='time']").val(announcement.time);
            if (promoType === "Turbo") {
                currentPanel.find(".turbo-option-select").val(parseTurboPeriod(announcement.period));
            }
            applyScheduleImages(currentPanel[0], announcement.images);
            currentPanel.attr("data-state", announcement.state || "");
            currentPanel.data("state", announcement.state || "");
        });
    });

    ["1x1", "1x3", "1x7"].forEach(promoType => {
        pubs.filter((typer) => { if (typer.typeAnnuncio && typer.typeAnnuncio.includes(promoType)) return typer }, promoType).forEach(announcement => {
            announcement.time = announcement.data.split("T")[1].split(":00.")[0];
            const timeslot = findPremiumTimeSlotForPeriod(promoType, announcement.period);
            if (!timeslot) return;

            const checkbox = timeslot.querySelector(".flex-checkbox input");
            if (checkbox && !checkbox.checked) {
                checkbox.click();
            } else {
                const addButton = timeslot.querySelector(":scope > .posts > .btn-primary");
                if (addButton) addButton.click();
            }

            const currentPanel = timeslot.querySelector(".newpost-panel:last-child");
            if (!currentPanel) return;
            $(currentPanel).attr("data-id", announcement.id);
            $(currentPanel).data("id", announcement.id);
            currentPanel.querySelector("input[type='time']").value = announcement.time;
            applyScheduleImages(currentPanel, announcement.images);
            $(currentPanel).attr("data-state", announcement.state || "");
            $(currentPanel).data("state", announcement.state || "");
        });
    });
};

function deletefuture() {
    if (confirm("Sicuro di voler eliminare le pubblicazioni programmate?")) {
        Object.keys(pubs).forEach(x => {
            if (new Date(x) > new Date) {
                pubs[x].forEach(y => {
                    y.GCRecord = true;
                    $(`.newpost-panel[data-id="${y.id}"`).data("GCRecord", true);
                    $(`.newpost-panel[data-id="${y.id}"`).attr("data-GCRecord", true);
                    $(`.newpost-panel[data-id="${y.id}"`).css("display", "none");
                });
            }
        });
        $(`.newpost-panel`).each((i, x) => {
            if (!$(x).attr("data-id")) {
                $(x).data("GCRecord", true);
                $(x).attr("data-GCRecord", true);
                $(x).css("display", "none");
            }
        });
        requestUpdate();
        var newDateSel = null;
        $(".day").each((i, f) => {
            if (!$(f).hasClass("wrong-month")) {
                var d = new Date($(f).data("date"));
                if (d < new Date) { newDateSel = f; }
            }
        });
        newDateSel.click();
    }
}

//===============================================================
document.querySelectorAll(".promoPanel .newpost-wrapper").forEach((p) => {
    setDefaultDatetime(
        p.querySelector("input[type='time']"),
    );
});

const getCheckedPics = (checkbox) => {
    let result = 0;
    checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
        if (c.checked) result++;
    });
    return result;
};

const createPhotoButton = () => {
    const picsButton = document.createElement("button");
    picsButton.type = "button";
    picsButton.classList.add("btn");
    picsButton.classList.add("btn-dark");
    picsButton.classList.add("btnPhoto");
    picsButton.innerHTML = `<i class='fa fa-camera'></i>`;

    picsButton.addEventListener("click", () => {
        safeEnableScheduleUpdate();
        const postPanel = picsButton.parentElement.parentElement;
        $(postPanel).attr("data-state", "EDIT");
        $(postPanel).data("state", "EDIT");
        const isEnabled = picsButton.classList.contains("btn-dark");
        picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
        if (!isEnabled) {
            const postPics = postPanel.querySelector(".post-pics");
            if (postPics) postPics.remove();
            return;
        };

        const postPics = document.createElement("div");
        postPics.classList.add("post-pics");

        document.querySelectorAll(".persistent .pic-panel img").forEach((picEl) => {
            const picId = btoa(Math.random().toString()).substr(10, 16);

            const postPicWrapper = document.createElement("div");
            postPicWrapper.classList.add("post-pic-wrapper");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.classList.add("form-check-input");
            checkbox.id = picId;
            checkbox.checked = true;
            $(checkbox).attr("data-id", $(picEl).parents(".pic-panel").data("id"));
            const label = document.createElement("label");
            label.setAttribute("for", picId);
            const postImgEl = document.createElement("img");
            postImgEl.src = picEl.src;

            const btnAnteprima = document.createElement("button");
            btnAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
            btnAnteprima.innerHTML = "ANTEPRIMA";
            checkbox.addEventListener("click", () => {
                markSchedulePanelEdited(checkbox);
                safeEnableScheduleUpdate();
                const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                const checkedPics = getCheckedPics(checkbox);
                if (checkbox.checked) {
                    if (checkedPics >= 6) {
                        checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                            if (c.checked) return;
                            c.setAttribute("disabled", true);
                        });
                    };
                    if (currentAnteprima) return;
                    thisAnteprimaButton.setAttribute("class", "btn btn-warning btn-anteprima");
                    return;
                };
                checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                    c.removeAttribute("disabled");
                });
                if (!thisAnteprimaButton.classList.contains("btn-warning")) return;
                thisAnteprimaButton.setAttribute("class", "btn btn-secondary btn-anteprima");
                const picWrappers = checkbox.parentElement.parentElement.querySelectorAll(".post-pic-wrapper");
                for (let picWrapper of picWrappers) {
                    if (picWrapper.querySelector("input").checked)
                        return picWrapper.querySelector("button").setAttribute("class", "btn btn-warning btn-anteprima");
                };
            });

            btnAnteprima.addEventListener("click", () => {
                safeEnableScheduleUpdate();
                markSchedulePanelEdited(btnAnteprima);
                if (!btnAnteprima.parentElement.querySelector("input").checked) {
                    const checkedPics = getCheckedPics(btnAnteprima);
                    if (checkedPics >= 6) return;
                    btnAnteprima.parentElement.querySelector("input").click();
                }
                if (btnAnteprima.classList.contains("btn-warning")) return;
                const currentAnteprima = btnAnteprima.parentElement.parentElement.querySelector("button.btn.btn-warning");
                if (currentAnteprima)
                    currentAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                btnAnteprima.setAttribute("class", "btn btn-warning btn-anteprima");
            });

            postPicWrapper.appendChild(checkbox);
            postPicWrapper.appendChild(label);
            postPicWrapper.appendChild(btnAnteprima);
            label.appendChild(postImgEl);
            postPics.appendChild(postPicWrapper);

        });

        postPanel.appendChild(postPics);
    });

    return picsButton;
};

const applyScheduleImages = (panel, images = []) => {
    if (!panel || !Array.isArray(images) || images.length === 0) return;

    const selectedIds = new Set(images.map((image) => `${image.galleria}`));
    const anteprimaImage = images.find((image) => image.isAnteprima) || images[0];
    const anteprimaId = `${anteprimaImage.galleria}`;
    const photoButton = panel.querySelector(".btnPhoto");
    if (!photoButton) return;

    if (!photoButton.classList.contains("btn-success")) {
        photoButton.click();
    }

    panel.querySelectorAll(".post-pic-wrapper").forEach((wrapper) => {
        const checkbox = wrapper.querySelector("input");
        const anteprimaButton = wrapper.querySelector(".btn-anteprima");
        if (!checkbox) return;

        const checkboxId = `${$(checkbox).data("id")}`;
        if (!selectedIds.has(checkboxId) && checkbox.checked) {
            checkbox.click();
        }

        if (checkboxId === anteprimaId && anteprimaButton && !anteprimaButton.classList.contains("btn-warning")) {
            anteprimaButton.click();
        }
    });
};

const createFreeSchedulePanel = (panel, promoType = "Free") => {
    safeEnableScheduleUpdate();
    if (!panel) return;
    const newPostPanel = document.createElement("div");
    newPostPanel.classList.add("newpost-panel");
    newPostPanel.dataset.promoType = promoType;

    tmpID = tmpID + 1;
    $(newPostPanel).data("relativeID", tmpID);
    $(newPostPanel).attr("data-relativeID", tmpID);

    const newPost = document.createElement("div");
    newPost.classList.add("newpost-wrapper");

    const dateTime = document.createElement("label");
    dateTime.innerText = `${currentDay || $("#txtDate").val()} `;
    dateTime.classList.add("lblDateTime");

    const timeInput = document.createElement("input");
    timeInput.classList.add("form-control");
    timeInput.setAttribute("type", "time");
    setDefaultDatetime(timeInput);
    timeInput.addEventListener("change", () => {
        safeEnableScheduleUpdate();
        markSchedulePanelEdited(timeInput);
    });

    const delButton = document.createElement("button");
    delButton.type = "button";
    delButton.classList.add("btn");
    delButton.classList.add("btn-danger");
    delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;
    delButton.addEventListener("click", () => {
        $(newPostPanel).hide();
        $(newPostPanel).data("GCRecord", true);
        safeEnableScheduleUpdate();
    });

    const picsButton = createPhotoButton();
    const turboSelect = promoType === "Turbo" ? createTurboOptionSelect() : null;

    newPost.appendChild(dateTime);
    newPost.appendChild(timeInput);
    if (turboSelect) newPost.appendChild(turboSelect);
    newPost.appendChild(delButton);
    newPost.appendChild(picsButton);
    newPostPanel.appendChild(newPost);

    panel.querySelector(".post-list").appendChild(newPostPanel);
};

const postsPanelOperations = (panel) => {
    const addButton = Array.from(panel.children).find((child) => child.classList && child.classList.contains("btn-primary"));
    if (!addButton) return;
    addButton.type = "button";
    if (addButton.getAttribute("onclick")) return;
    addButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        addFreeSchedule(addButton);
    });
}
document.querySelectorAll(".promoFree > .posts, .promoTurbo > .posts").forEach(postsPanelOperations);

function addFreeSchedule(button) {
    const panel = button && button.closest ? button.closest(".posts") : document.querySelector(".promoFree > .posts");
    if (!panel) return;
    createFreeSchedulePanel(panel, "Free");
}
window.addFreeSchedule = addFreeSchedule;

function addTurboSchedule(button) {
    const panel = button && button.closest ? button.closest(".posts") : document.querySelector(".promoTurbo > .posts");
    if (!panel) return;
    createFreeSchedulePanel(panel, "Turbo");
}
window.addTurboSchedule = addTurboSchedule;

const createPremiumSchedulePanel = (panel, promoType) => {
    safeEnableScheduleUpdate();
    if (!panel) return;

    const newPostPanel = document.createElement("div");
    newPostPanel.classList.add("newpost-panel");

    tmpID = tmpID + 1;
    $(newPostPanel).data("relativeID", tmpID);
    $(newPostPanel).attr("data-relativeID", tmpID);

    const newPost = document.createElement("div");
    newPost.classList.add("newpost-wrapper");

    const dateTime = document.createElement("label");
    dateTime.innerText = `${currentDay || $("#txtDate").val()} `;
    dateTime.classList.add("lblDateTime");

    const timeInput = document.createElement("input");
    timeInput.classList.add("form-control");
    timeInput.setAttribute("type", "time");
    setDefaultDatetime(timeInput);
    timeInput.addEventListener("change", () => {
        safeEnableScheduleUpdate();
        markSchedulePanelEdited(timeInput);
    });

    const delButton = document.createElement("button");
    delButton.type = "button";
    delButton.classList.add("btn");
    delButton.classList.add("btn-danger");
    delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;
    delButton.addEventListener("click", () => {
        safeEnableScheduleUpdate();
        $(newPostPanel).hide();
        $(newPostPanel).data("GCRecord", true);
        $(newPostPanel).attr("data-GCRecord", true);
    });

    const picsButton = createPhotoButton();
    const goldSlots = createGoldSlotsSelector();

    newPost.appendChild(dateTime);
    newPost.appendChild(timeInput);
    newPost.appendChild(delButton);
    newPost.appendChild(picsButton);
    newPostPanel.appendChild(newPost);
    newPostPanel.appendChild(goldSlots);
    newPostPanel.dataset.promoType = promoType || "";

    panel.querySelector(".post-list").appendChild(newPostPanel);
};

function addPremiumSchedule(button, promoType) {
    const panel = button && button.closest ? button.closest(".posts") : document.querySelector(`.promo${promoType} > .posts`);
    if (!panel) return;
    createPremiumSchedulePanel(panel, promoType);
}
window.addPremiumSchedule = addPremiumSchedule;

const togglePremiumCam = (btn, premium, highlight, etichetta) => {
    const postPanel = $(btn).parents(".newpost-panel");
    // console.log('toggling', { btn, premium, highlight, etichetta });
    if ($(btn).hasClass("btn-success")) {
        $(btn).attr("class", "btn btn-default");
        // if (premium) {
        //     postPanel.data("premium", false);
        //     postPanel.attr("data-premium", false);
        // }
        // if (highlight) {
        //     postPanel.data("highlight", false);
        //     postPanel.attr("data-highlight", false);
        // }
        // if (etichetta) {
        //     postPanel.data("etichetta", false);
        //     postPanel.attr("data-etichetta", false);
        // }
        // if (!premium && !highlight && !etichetta) {
        //     postPanel.data("cam", false);
        //     postPanel.attr("data-cam", false);
        // }
    } else {
        $(btn).attr("class", "btn btn-success");
        // if (premium) {
        //     postPanel.data("premium", true);
        //     postPanel.attr("data-premium", true);
        // }
        // if (highlight) {
        //     postPanel.data("highlight", true);
        //     postPanel.attr("data-highlight", true);
        // }
        // if (etichetta) {
        //     postPanel.data("etichetta", true);
        //     postPanel.attr("data-etichetta", true);
        // }
        // if (!premium && !highlight && !etichetta) {
        //     postPanel.data("cam", true);
        //     postPanel.attr("data-cam", true);
        // }
    }
}

// TimeSlot Operations(Add/Delete TimeSlot) when click + button in timeslot
const timeSlotPanelOperations = (panel) => {
    const addPostButton = panel.querySelector(".btn-primary");
    if (!addPostButton) return;
    addPostButton.addEventListener("click", () => {
        safeEnableScheduleUpdate();
        const newPostPanel = document.createElement("div");
        newPostPanel.classList.add("newpost-panel");
        console.log('add new post panel')
        $(newPostPanel).data("duration", '1');
        $(newPostPanel).attr("data-duration", '1');

        tmpID = tmpID + 1;
        $(newPostPanel).data("relativeID", tmpID);
        $(newPostPanel).attr("data-relativeID", tmpID);
        const newPost = document.createElement("div");
        newPost.classList.add("newpost-wrapper");

        const dateTime = document.createElement("label");
        dateTime.innerText = currentDay;
        dateTime.classList.add("lblDateTime");

        const timeInput = document.createElement("input");
        timeInput.classList.add("form-control");
        timeInput.setAttribute("type", "time");
        setDefaultDatetime(timeInput);
        timeInput.addEventListener("change", () => {
            safeEnableScheduleUpdate();
            markSchedulePanelEdited(timeInput);
        });

        const delButton = document.createElement("button");
        delButton.classList.add("btn");
        delButton.classList.add("btn-danger");
        delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;

        const picsButton = document.createElement("button");
        picsButton.classList.add("btn");
        picsButton.classList.add("btn-dark");
        picsButton.classList.add("btnPhoto");
        picsButton.innerHTML = `<i class='fa fa-camera'></i>`;

        picsButton.addEventListener("click", () => {
            safeEnableScheduleUpdate();
            const postPanel = picsButton.parentElement.parentElement;
            $(postPanel).attr("data-state", "EDIT");
            $(postPanel).data("state", "EDIT");
            const isEnabled = picsButton.classList.contains("btn-dark");
            picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
            if (!isEnabled) {
                return postPanel.querySelector(".post-pics").remove();
            };

            const postPics = document.createElement("div");
            postPics.classList.add("post-pics");

            document.querySelectorAll(".persistent .pic-panel img").forEach((picEl) => {
                const picId = btoa(Math.random().toString()).substr(10, 16);

                const postPicWrapper = document.createElement("div");
                postPicWrapper.classList.add("post-pic-wrapper");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("form-check-input");
                checkbox.id = picId;
                checkbox.checked = true;
                $(checkbox).attr("data-id", $(picEl).parents(".pic-panel").data("id"));
                const label = document.createElement("label");
                label.setAttribute("for", picId);
                const postImgEl = document.createElement("img");
                postImgEl.src = picEl.src;

                const btnAnteprima = document.createElement("button");
                btnAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                btnAnteprima.innerHTML = "ANTEPRIMA";
                checkbox.addEventListener("click", () => {
                    markSchedulePanelEdited(checkbox);
                    safeEnableScheduleUpdate();
                    const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                    const checkedPics = getCheckedPics(checkbox);
                    if (checkbox.checked) {
                        if (checkedPics >= 6) {
                            checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                                if (c.checked) return;
                                c.setAttribute("disabled", true);
                            });
                        };
                        if (currentAnteprima) return;
                        thisAnteprimaButton.setAttribute("class", "btn btn-warning btn-anteprima");
                        return;
                    };
                    checkbox.parentElement.parentElement.querySelectorAll("input").forEach((c) => {
                        c.removeAttribute("disabled");
                    });
                    if (!thisAnteprimaButton.classList.contains("btn-warning")) return;
                    thisAnteprimaButton.setAttribute("class", "btn btn-secondary btn-anteprima");
                    const picWrappers = checkbox.parentElement.parentElement.querySelectorAll(".post-pic-wrapper");
                    for (let picWrapper of picWrappers) {
                        if (picWrapper.querySelector("input").checked)
                            return picWrapper.querySelector("button").setAttribute("class", "btn btn-warning btn-anteprima");
                    };
                });

                btnAnteprima.addEventListener("click", () => {
                    safeEnableScheduleUpdate();
                    markSchedulePanelEdited(btnAnteprima);
                    if (!btnAnteprima.parentElement.querySelector("input").checked) {
                        const checkedPics = getCheckedPics(btnAnteprima);
                        if (checkedPics >= 6) return;
                        btnAnteprima.parentElement.querySelector("input").click();
                    }
                    if (btnAnteprima.classList.contains("btn-warning")) return;
                    const currentAnteprima = btnAnteprima.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    if (currentAnteprima)
                        currentAnteprima.setAttribute("class", "btn btn-secondary btn-anteprima");
                    btnAnteprima.setAttribute("class", "btn btn-warning btn-anteprima");
                });

                postPicWrapper.appendChild(checkbox);
                postPicWrapper.appendChild(label);
                postPicWrapper.appendChild(btnAnteprima);
                label.appendChild(postImgEl);
                postPics.appendChild(postPicWrapper);

            });

            postPanel.appendChild(postPics);
        });

        delButton.addEventListener("click", () => {
            safeEnableScheduleUpdate();
            console.log('delete1')
            if (panel.querySelectorAll(".newpost-wrapper").length === 1) {
                panel.parentElement.querySelector("input").click();
            }
            //newPostPanel.remove();
            $(newPostPanel).fadeOut();
            $(newPostPanel).data("GCRecord", true);
        });

        newPost.appendChild(dateTime);
        newPost.appendChild(timeInput);
        newPost.appendChild(delButton);
        newPost.appendChild(picsButton);
        newPostPanel.appendChild(newPost);
        panel.querySelector(".post-list").appendChild(newPostPanel);
    });

    const newSinglePanel = panel.querySelector(".newpost-wrapper:first-child");
    if (!newSinglePanel) return;
    newSinglePanel.querySelector(".btn-danger").addEventListener("click", () => {
        if (panel.querySelectorAll(".newpost-wrapper").length == 1)
            panel.parentElement.querySelector("input").click();
        console.log('delete0002')
        //newSinglePanel.parentElement.remove();
        $(newSinglePanel.parentElement).hide();
        $(newSinglePanel.parentElement).data("GCRecord", true);
    });
}
