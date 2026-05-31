// Change background-color when choose Toplist
$(".promoType>ul>li").on("click", (me) => {
    $("#wizar-body").css("background-color", $(me.target).css("background-color"));
})

var dropPromoDuration = (selected) => {
    var dropBox = document.createElement("select");
    var optionsStr = [
        { value: "1", text: "1 giorno" },
        { value: "3", text: "3 giorno" },
        { value: "7", text: "1 settimana" },
        { value: "14", text: "2 settimana" },
        // { value: "28", text: "4 settimana" }
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


// Add sub timeslot when click checkbox
document.querySelectorAll(".time-slot").forEach((timeslot) => {
    const checkbox = timeslot.querySelector(".flex-checkbox input");
    checkbox.addEventListener("click", () => {
        enableScheduleUpdate();
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

            const durationPost = dropPromoDuration('1');
            durationPost.classList.add("form-control");
            durationPost.style.marginLeft = "12px";
            durationPost.style.width = "120px";

            const dateTime = document.createElement("label");
            // dateTime.innerText = `${$("#txtDate").val()}`;
            dateTime.innerHTML = currentDay;
            dateTime.classList.add("lblDateTime");

            const timeInput = document.createElement("input");
            timeInput.classList.add("form-control");
            timeInput.setAttribute("type", "time");
            timeInput.value = checkbox.parentElement.querySelector("label").innerText.split("-")[0].trim();
            // setDefaultDatetime(timeInput);

            // Delete Button
            const delButton = document.createElement("button");
            delButton.classList.add("btn");
            delButton.classList.add("btn-danger");
            delButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" fill="white" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="25px" height="20px" viewBox="0 0 503.021 503.021" style="transform: scale(0.7) translate(-6px, 2px);" xml:space="preserve"><g><g><path d="M491.613,75.643l-64.235-64.235c-15.202-15.202-39.854-15.202-55.056,0L251.507,132.222L130.686,11.407 c-15.202-15.202-39.853-15.202-55.055,0L11.401,75.643c-15.202,15.202-15.202,39.854,0,55.056l120.821,120.815L11.401,372.328 c-15.202,15.202-15.202,39.854,0,55.056l64.235,64.229c15.202,15.202,39.854,15.202,55.056,0l120.815-120.814l120.822,120.814 c15.202,15.202,39.854,15.202,55.056,0l64.235-64.229c15.202-15.202,15.202-39.854,0-55.056L370.793,251.514l120.82-120.815 C506.815,115.49,506.815,90.845,491.613,75.643z"/></g></g></svg>`;

            //Pics Button
            const picsButton = document.createElement("button");
            picsButton.classList.add("btn");
            picsButton.classList.add("btn-dark");
            picsButton.classList.add("btnPhoto");
            picsButton.innerHTML = `<i class='fa fa-camera'></i>`;

            // Add button
            const addButton = document.createElement("button");
            addButton.classList.add("btn");
            addButton.classList.add("btn-primary");
            addButton.innerHTML = "<b>+</b>";

            picsButton.addEventListener("click", () => {
                const postPanel = picsButton.parentElement.parentElement;
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
                        $(checkbox).parents(".newpost-panel").attr("data-state", "EDIT");
                        const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                        const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                        const checkedPics = getCheckedPics(checkbox);
                        if (checkbox.checked) {
                            if (checkedPics >= 5) {
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
                        enableScheduleUpdate();
                        $(btnAnteprima).parents(".newpost-panel").attr("data-state", "EDIT");
                        if (!btnAnteprima.parentElement.querySelector("input").checked) {
                            const checkedPics = getCheckedPics(btnAnteprima);
                            if (checkedPics >= 5) return;
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

            durationPost.addEventListener("change", (x) => {
                enableScheduleUpdate();
                $(durationPost).parents(".newpost-panel").attr("data-state", "EDIT");
                $(durationPost).parents(".newpost-panel").attr("data-duration", x.currentTarget.value);
                $(durationPost).parents(".newpost-panel").data("duration", x.currentTarget.value);
            });

            postsDiv.appendChild(postsListDiv);
            postsDiv.appendChild(addButton);
            newPostPanel.appendChild(newPostWrapper);
            postsListDiv.appendChild(newPostPanel);
            newPostWrapper.appendChild(dateTime);
            newPostWrapper.appendChild(timeInput);
            newPostWrapper.appendChild(delButton);
            newPostWrapper.appendChild(picsButton);
            newPostWrapper.appendChild(durationPost);
            timeSlotPanelOperations(postsDiv);
            timeslot.appendChild(postsDiv);
        }

    });
});

//When click Publish/Modify button
async function updateSchedule() {
    console.log(currentDay, 'updateSchedule function')
    pubs[currentDay] = await getSelectedDayPubs(currentDay);
    console.log(pubs, 'updateSchedule')
    // const phone = document.querySelector("input[name='phone']").value;
    requestUpdate(true);
};


// Get Schedule From Timeslot
function getSelectedDayPubs(currentDate) {
    let result = [];
    let i = 0;
    ["Free", "1x", "3x"].forEach(promoType => {
        document.querySelectorAll(`.promo${promoType} .newpost-panel`).forEach(panel => {
            let typeData = {};
            let promoDuration = $(panel).data("duration");
            // console.log(promoDuration,'promoDuration');
            // console.log($(panel).parents(".time-slot").find(".flex-checkbox label").text().trim(), "period")
            if (promoType == 'Free') {
                typeData.typeAnnuncio = promoType;
            } else {
                typeData.typeAnnuncio = promoType + promoDuration;
            }
            typeData.typePeriodic = "Top";

            typeData.period = $(panel).parents(".time-slot").find(".flex-checkbox label").text();
            typeData.city = document.querySelector("input[name='city']").value

            let images = [];
            typeData.id = "";
            if ($(panel).data("id")) typeData.id = $(panel).data("id");
            if ($(panel).data("relativeID")) typeData.relativeID = $(panel).data("relativeID");
            if ($(panel).data("state")) typeData.state = $(panel).data("state");

            typeData.GCRecord = null;
            if ($(panel).data("GCRecord")) typeData.GCRecord = $(panel).data("GCRecord");
            if ($(".btnPhoto").hasClass("btn-success")) {
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
            if (currentDate) {
                typeData.data = `${currentDate}T${panel.querySelector("input").value}:00.000Z`;
            } else {
                typeData.data = `${$("#txtDate").val()}T${panel.querySelector("input").value}:00.000Z`;
            }
            //     images,
            // });
            typeData.images = images;
            if (typeData.id == undefined) return;
            result[i] = typeData;
            i++;
        });
    });

    return result;
};

function loadDay(date) {
    clearPubsViews();
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
    ["Free"].forEach(promoType => {
        pubs.filter((typer) => { if (typer.typeAnnuncio == promoType) return typer }, promoType).forEach(announcement => {
            console.log(announcement, 'announcement in loadDayData')
            if (announcement.status !== undefined && announcement.status !== "pending") return;
            document.querySelector(`.promo${promoType} .btn-primary`).click();
            $(`.promo${promoType} .newpost-panel:last-child`).attr("data-id", announcement.id);
            announcement.time = announcement.data.split("T")[1].split(":00.")[0];
            document.querySelector(`.promo${promoType} .newpost-panel:last-child input`).value = announcement.time;
            if (!announcement.images.length) return;
            if (document.querySelector(`.promo${promoType} .newpost-panel:last-child .btn-dark`)) {
                document.querySelector(`.promo${promoType} .newpost-panel:last-child .btn-dark`).click();
            }
            $(`.promo${promoType} .newpost-panel:last-child`).attr("data-city", announcement.city);
            document.querySelector(`.promo${promoType} .newpost-panel:last-child select`).value = announcement.city;
            if (promoType != "Free") {
                if (announcement.hasPremium) togglePremiumCam($(`.promo${promoType} .newpost-panel:last-child`).find(".btnPremium"), true);
                if (announcement.hasVideo) togglePremiumCam($(`.promo${promoType} .newpost-panel:last-child`).find(".btnCam"), false);
                if (announcement.hasHighlight) togglePremiumCam($(`.promo${promoType} .newpost-panel:last-child`).find(".btnHighlight"), false, true);
                if (announcement.hasEtichetta) togglePremiumCam($(`.promo${promoType} .newpost-panel:last-child`).find(".btnEtichetta"), false, false, true);
                $(`.promo${promoType} .newpost-panel:last-child`).attr("data-premium", announcement.hasPremium);
                $(`.promo${promoType} .newpost-panel:last-child`).attr("data-cam", announcement.hasVideo);
                $(`.promo${promoType} .newpost-panel:last-child`).attr("data-highlight", announcement.hasHighlight);
                $(`.promo${promoType} .newpost-panel:last-child`).attr("data-etichetta", announcement.hasEtichetta);
                // document.querySelector(`.promo${promoType} .flex-checkbox.videochiamata-promo input`).checked = announcement.hasVideo;
                // if(announcement.hasVideo) $(`.promo${promoType}`).addClass("videochiamata-promo");
                // document.querySelector(`.promo${promoType} .flex-checkbox.premium-promo input`).checked = announcement.hasPremium;
                // if(announcement.hasPremium) $(`.promo${promoType}`).addClass("premium-promo");
            }
            $(`.promo${promoType} .newpost-panel:last-child .post-pics div input`).each((i, btn) => {
                var targetID = $(btn).data("id");
                var cont = announcement.images.filter((x) => { if (x.galleria == targetID) return x }, targetID);
                if (cont.length == 0) {
                    $(btn).click();
                } else {
                    if (cont[0].isAnteprima) $(btn).parents(".post-pic-wrapper").find(".btn-anteprima").click();
                }
            });
            $(`.promo${promoType} .newpost-panel:last-child`).attr("data-state", announcement.state);
            // announcement.images.forEach(index => {
            //     var btnImg = $(`.promo${promoType} .newpost-panel:last-child .post-pics div input[data-id="${index.galleria}"]`);
            //     btnImg.click();
            //     if(index.isAnteprima) $(btnImg).parents(".post-pic-wrapper").find(".btn-anteprima").click();
            // });
        });
    });

    ["1x", "3x"].forEach(promoType => {
        document.querySelectorAll(`.promo${promoType} .time-slot`).forEach(timeslot => {
            let openPeriod = true;
            pubs.filter((typer) => { if (typer.typeAnnuncio.includes(promoType)) return typer }, promoType).forEach(announcement => {
                const timeslotLabel = timeslot.querySelector("label").innerText;
                if (announcement.period != timeslotLabel) return;

                announcement.time = announcement.data.split("T")[1].split(":00.")[0];
                if (openPeriod && $(timeslot).find(".posts:visible").length == 0) {
                    timeslot.querySelector("input").click();
                    openPeriod = false;
                } else {
                    $(timeslot).find(`.btn-primary`).click();
                }

                let duration = announcement.typeAnnuncio.replace(promoType, "");
                $(timeslot).find(`.newpost-panel`).attr("data-id", announcement.id);
                $(timeslot).parents(".newpost-panel").attr("data-duration", duration);
                $(timeslot).parents(".newpost-panel").data("duration", duration);

                timeslot.querySelector(`.newpost-panel:last-child input`).value = announcement.time;
                timeslot.querySelector(`.newpost-panel:last-child select`).value = duration;

                if (announcement.images.length > 0) {
                    $(timeslot).find(`.btn-dark`).click()
                    $(timeslot).find(`.newpost-panel:last-child .post-pics div input`).each((i, btn) => {
                        var targetID = $(btn).data("id");
                        // console.log(targetID, btn, 'targetId')
                        var cont = announcement.images.filter((x) => { if (x.galleria == targetID) return x }, targetID);
                        if (cont.length == 0) {
                            $(btn).click();
                        } else {
                            if (cont[0].isAnteprima) $(btn).parents(".post-pic-wrapper").find(".btn-anteprima").click();
                        }
                    });
                }
                $(timeslot).find(`.newpost-panel:last-child`).attr("data-state", announcement.state);
            });
        })
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
const setDefaultDatetime = (timeInput) => {
    timeInput.value = new Date().toLocaleTimeString("it", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

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

const postsPanelOperations = (panel) => {
    panel.querySelector(".btn-primary").addEventListener("click", () => {
        enableScheduleUpdate();
        const newPostPanel = document.createElement("div");
        newPostPanel.classList.add("newpost-panel");

        //Add promo duration in post 
        $(newPostPanel).data("duration", '1');
        $(newPostPanel).attr("data-duration", '1');


        tmpID = tmpID + 1;
        $(newPostPanel).data("relativeID", tmpID);
        $(newPostPanel).attr("data-relativeID", tmpID);
        const newPost = document.createElement("div");
        newPost.classList.add("newpost-wrapper");

        const durationPost = dropPromoDuration('1');
        durationPost.classList.add("form-control");
        durationPost.style.marginLeft = "12px";
        durationPost.style.width = "120px";

        const dateTime = document.createElement("label");
        dateTime.innerText = `${$("#txtDate").val()} `;
        dateTime.classList.add("lblDateTime");

        const timeInput = document.createElement("input");
        timeInput.classList.add("form-control");
        timeInput.setAttribute("type", "time");
        setDefaultDatetime(timeInput);

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
            enableScheduleUpdate();
            const postPanel = picsButton.parentElement.parentElement;
            const isEnabled = picsButton.classList.contains("btn-dark");
            picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
            if (!isEnabled) {
                return postPanel.querySelector(".post-pics").remove();
            };

            const postPics = document.createElement("div");
            postPics.classList.add("post-pics");

            var anteprimaSel = false;
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
                    $(checkbox).parents(".newpost-panel").attr("data-state", "EDIT");
                    enableScheduleUpdate();
                    const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                    const checkedPics = getCheckedPics(checkbox);
                    if (checkbox.checked) {
                        if (checkedPics >= 5) {
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
                    enableScheduleUpdate();
                    $(btnAnteprima).parents(".newpost-panel").attr("data-state", "EDIT");
                    if (!$(btnAnteprima).parent().find("input").is(":checked")) {
                        const checkedPics = getCheckedPics(checkbox);
                        if (checkedPics >= 5) return;
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

                if (!anteprimaSel) {
                    btnAnteprima.click();
                    anteprimaSel = true;
                }
            });

            postPanel.appendChild(postPics);
        });

        delButton.addEventListener("click", () => {
            //newPostPanel.remove();
            console.log("delete001")
            $(newPostPanel).hide();
            $(newPostPanel).data("GCRecord", true);
            enableScheduleUpdate();
        });

        durationPost.addEventListener("change", (x) => {
            enableScheduleUpdate();
            $(durationPost).parents(".newpost-panel").attr("data-state", "EDIT");
            $(durationPost).parents(".newpost-panel").attr("data-duration", x.currentTarget.value);
            $(durationPost).parents(".newpost-panel").data("duration", x.currentTarget.value);
        });

        newPost.appendChild(dateTime);
        newPost.appendChild(timeInput);
        newPost.appendChild(delButton);
        newPost.appendChild(picsButton);
        newPost.appendChild(durationPost);
        newPostPanel.appendChild(newPost);

        panel.querySelector(".post-list").appendChild(newPostPanel);
    });
}
document.querySelectorAll(".posts").forEach(postsPanelOperations);

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
    panel.querySelector(".btn-primary").addEventListener("click", () => {
        enableScheduleUpdate();
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

        const durationPost = dropPromoDuration('1');
        durationPost.classList.add("form-control");
        durationPost.style.marginLeft = "12px";
        durationPost.style.width = "120px";

        const dateTime = document.createElement("label");
        dateTime.innerText = currentDay;
        dateTime.classList.add("lblDateTime");

        const timeInput = document.createElement("input");
        timeInput.classList.add("form-control");
        timeInput.setAttribute("type", "time");
        timeInput.value = panel.querySelector(".btn-primary").parentElement.parentElement.querySelector("label").innerText.split("-")[0].trim();

        // setDefaultDatetime(timeInput);
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
            enableScheduleUpdate();
            const postPanel = picsButton.parentElement.parentElement;
            const isEnabled = picsButton.classList.contains("btn-dark");
            picsButton.setAttribute("class", `btnPhoto btn btn-${isEnabled ? "success" : "dark"}`);
            if (!isEnabled) {
                return postPanel.querySelector(".post-pics").remove();
            };

            const postPics = document.createElement("div");
            postPics.classList.add("post-pics");

            var anteprimaSel = false;
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
                    $(checkbox).parents(".newpost-panel").attr("data-state", "EDIT");
                    enableScheduleUpdate();
                    const currentAnteprima = checkbox.parentElement.parentElement.querySelector("button.btn.btn-warning");
                    const thisAnteprimaButton = checkbox.parentElement.querySelector("button");
                    const checkedPics = getCheckedPics(checkbox);
                    if (checkbox.checked) {
                        if (checkedPics >= 5) {
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
                    enableScheduleUpdate();
                    $(btnAnteprima).parents(".newpost-panel").attr("data-state", "EDIT");
                    if (!btnAnteprima.parentElement.querySelector("input").checked) {
                        const checkedPics = getCheckedPics(btnAnteprima);
                        if (checkedPics >= 5) return;
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

                if (!anteprimaSel) {
                    btnAnteprima.click();
                    anteprimaSel = true;
                }
            });

            postPanel.appendChild(postPics);
        });

        delButton.addEventListener("click", () => {
            enableScheduleUpdate();
            console.log('delete1')
            if (panel.querySelectorAll(".newpost-wrapper").length === 1) {
                panel.parentElement.querySelector("input").click();
            }
            //newPostPanel.remove();
            $(newPostPanel).fadeOut();
            $(newPostPanel).data("GCRecord", true);
        });

        durationPost.addEventListener("change", (x) => {
            enableScheduleUpdate();
            $(durationPost).parents(".newpost-panel").attr("data-state", "EDIT");
            $(durationPost).parents(".newpost-panel").attr("data-duration", x.currentTarget.value);
            $(durationPost).parents(".newpost-panel").data("duration", x.currentTarget.value);
        });

        newPost.appendChild(dateTime);
        newPost.appendChild(timeInput);
        newPost.appendChild(delButton);
        newPost.appendChild(picsButton);
        newPost.appendChild(durationPost);
        newPostPanel.appendChild(newPost);
        panel.querySelector(".post-list").appendChild(newPostPanel);
    });

    const newSinglePanel = panel.querySelector(".newpost-wrapper:first-child");
    newSinglePanel.querySelector(".btn-danger").addEventListener("click", () => {
        if (panel.querySelectorAll(".newpost-wrapper").length == 1)
            panel.parentElement.querySelector("input").click();
        console.log('delete0002')
        //newSinglePanel.parentElement.remove();
        $(newSinglePanel.parentElement).hide();
        $(newSinglePanel.parentElement).data("GCRecord", true);
    });
}
