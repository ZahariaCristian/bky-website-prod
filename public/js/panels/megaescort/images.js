
function getImgsFormData() {
    let formData = new FormData();
    return new Promise((resolve, reject) => {
        Promise.all([...document.querySelectorAll(".persistent img")].map(
            (imgEl) => {
                return new Promise((res, rej) => {
                    fetch(imgEl.src).then(response => {
                        var imgID = $(imgEl).parents(".pic-panel").data("id");
                        var hidden = $(imgEl).parents(".pics").hasClass("removed");
                        var isNew = $(imgEl).attr("src").indexOf("blob:") !== -1
                        response.blob().then(blob => res([blob, imgID, hidden, isNew]));
                    }).catch(() => rej());
                })
            })).then(blobs => {
                blobs.forEach(file => {
                    formData.append("imgs", file[0]);
                    formData.append("origin", file[1]);
                    formData.append("hidden", file[2]);
                    formData.append("isNew", file[3]);
                });
                resolve(formData);
            }).catch(() => reject());
    });
};

// Save images
function updateImages() {
    toggleLoader();
    const phone = document.querySelector("input[name='phone']").value;
    // alert(JSON.stringify(getImgsFormData()), 'save images')
    // console.log(phone, 'updateImages')
    getImgsFormData().then(formData => {
        console.log(JSON.stringify(formData), "getImgsFormData")
        updateImg(formData, phone);
    });
};

function updateImg(formData, phone) {
    fetch(`/images/update?phone=${phone}&ann=${QUERY_NEW}`, {
        method: "POST",
        body: formData,
    }).then(res => {
        if (res.status !== 201) return alert("❌ Si è verificato un errore durante l'aggiornamento delle immagini.");
        document.querySelector("#updatePicsBtn").setAttribute("disabled", true);
        //alert("🖼 Immagini aggiornate correttamente.");
        ShowAlert("lblSaved");
        setTimeout(() => {
            location.reload();
        }, 300);
    });
}

const loadImage = event => {
    var files = event.target || event;
    for (i = 0; i < files.files.length; i++) {
        if (files.files[i].size < 10485761) {
            let imgData = {
                src: URL.createObjectURL(files.files[i]),
                origin: files.files[i].name,
                donna: $("#donnaID").val()
            }

            console.log(imgData,"image data");

            enablePicsUpdate();

            //Salva uri su DB
            fetch("/images/addImg", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify({ ...imgData })
            }).then((r) => {
                if (r.status !== 200) return alert(
                    "⚠ Si è verificato un errore durante il caricamento della foto",
                );
                r.json().then(async (res) => {
                    addImage(res.src, res.id, res.isHidden);
                    document.querySelector("input[type='file']").value = "";
                });
            });
        } else {
            ShowAlert("custom", "Il file è troppo grande, è maggiore di 10Mb");
        }
    }
};

// IMAGE UPLOAD
const addImage = (imgUrl, idDB, isHidden, applyPhone, origin) => {
    const picCount = document.querySelectorAll(".pic-wrapper").length;
    const newId = "img" + picCount.toString();
    const picPanel = document.createElement("div");
    picPanel.classList.add("pic-panel");
    picPanel.setAttribute("id", newId);
    picPanel.setAttribute("data-origin", origin);
    picPanel.setAttribute("data-id", idDB);

    // Set background to gold if the ID is "img0"
    if (newId === "img0") {
        picPanel.style.backgroundColor = "gold"; // Set background to gold
    }

    const picOperations = document.createElement("div");
    picOperations.classList.add("pic-operations");
    const deleteButton = document.createElement("button");
    deleteButton.setAttribute("class", "btn btn-danger");
    deleteButton.innerHTML = `<i class="fa fa-times"></i>`;

    const editButton = document.createElement("button");
    editButton.setAttribute("class", "btn btn-primary");
    editButton.innerHTML = `<i class="fa fa-edit"></i>`;

    const rotateLeftButton = document.createElement("button");
    rotateLeftButton.setAttribute("class", "btn btn-primary");
    rotateLeftButton.innerHTML = `<i class="fa fa-rotate-left"></i>`;

    const restoreButton = document.createElement("button");
    restoreButton.setAttribute("class", "btn btn-success");
    restoreButton.innerHTML = `<i class="fa fa-mail-reply"></i>`;

    const picWrapper = document.createElement("div");
    picWrapper.classList.add("pic-wrapper");
    const imgEl = document.createElement("img");
    if (imgUrl.indexOf("?") != -1) {
        imgEl.src = imgUrl + "&id=" + idDB;
    } else {
        imgEl.src = imgUrl;
    }

    const leftButton = document.createElement("button");
    leftButton.setAttribute("class", "btn btn-succes");
    leftButton.innerHTML = `<i class="fa fa-arrow-left"></i>`;

    const rightButton = document.createElement("button");
    rightButton.setAttribute("class", "btn btn-succes");
    rightButton.innerHTML = `<i class="fa fa-arrow-right"></i>`;

    const downloadButton = document.createElement("button");
    downloadButton.setAttribute("class", "btn btn-primary");
    downloadButton.innerHTML = `<a href="${imgEl.src}" download="bky" target="_blank"><i class="fa fa-arrow-down" style="color:white"></i></a>`;

    const applyPhoneButton = document.createElement("button");
    if (applyPhone) {
        applyPhoneButton.setAttribute("class", "btn btn-primary");
    } else {
        applyPhoneButton.setAttribute("class", "btn");
    }
    applyPhoneButton.innerHTML = `<i class="fa fa-phone" id="applyPhoneTarget-${newId}" enabled="${applyPhone ? 'true' : 'false'}"></i>`;

    // Event listeners
    deleteButton.addEventListener("click", () => {
        var parent = $(imgEl).parents(".pics");
        if (parent.hasClass("persistent")) {
            deleteImgButton(newId, idDB, imgEl, editButton);
        } else {
            removeImgBtn(idDB, imgEl);
        }
    });

    applyPhoneButton.addEventListener("click", () => {
        var parent = $(imgEl).parents(".pics");
        console.log("PARENT", newId, idDB);
        if ($(`#applyPhoneTarget-${newId}`).attr("enabled") === "true") {
            applyPhoneImg(idDB, false);
        } else {
            applyPhoneImg(idDB, true);
        }
    });

    editButton.addEventListener("click", () => {
        editImgButton(newId, idDB, imgEl, editButton);
    });

    rotateLeftButton.addEventListener("click", () => {
        rotateLeft(newId, idDB, imgEl, rotateLeftButton);
    });

    restoreButton.addEventListener("click", () => {
        restoreImgButton(newId, idDB, imgEl, editButton);
    });

    leftButton.addEventListener("click", () => {
        movePicLeft(newId);
    });

    rightButton.addEventListener("click", () => {
        movePicRight(newId);
    });

    // Append elements to the picPanel
    picPanel.appendChild(picOperations);
    picPanel.appendChild(picWrapper);

    if (!isHidden) {
        //picOperations.appendChild(leftButton);
    }

    picOperations.appendChild(deleteButton);
    picOperations.appendChild(applyPhoneButton);
    picOperations.appendChild(editButton);
    picOperations.appendChild(rotateLeftButton);
    picOperations.appendChild(downloadButton);
    picOperations.appendChild(restoreButton);

    if (!isHidden) {
        //picOperations.appendChild(rightButton);
    }

    picWrapper.appendChild(imgEl);

    // Append the picPanel to the appropriate container
    if (isHidden) {
        $(picPanel).attr("id", newId + "removed");
        document.querySelector(".removed").appendChild(picPanel);
    } else {
        document.querySelector(".pics").appendChild(picPanel);
        picIds.push(newId);
    }
}

function insertBefore(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode);
}

function insertAtLastPosition(newNode, existingNode) {
    existingNode.parentNode.appendChild(newNode);
}

function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextElementSibling);
}

function updateOriginFilename(origin, newIndex) {
    if (!origin) {
        // If origin is null or undefined, return null or handle as needed
        return null; // Or return a default value if appropriate
    }

    // Extract the numeric part and the extension
    const match = origin.match(/^(\d+)(\..+)$/);
    if (!match) {
        // If the origin format is invalid, return the original value
        return origin; // Do not modify if the format is invalid
    }

    const [, , extension] = match;
    return `${newIndex}${extension}`; // Combine new index with the original extension
}

function removeImgBtn(id, el) {
    toggleLoader();
    fetch("/images/removeDefImg", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: id })
    }).then((r) => {
        toggleLoader();
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento della foto",
        );
        $(el).parents(".pic-panel").remove();
        //document.querySelector("#" + newId + "removed").remove();
        enablePicsUpdate();
    });
}

function applyImageCrop(idDB, cropData) {
    console.log(`Saving crop data for image with ID: ${idDB}`);
    console.log("Crop Data to Save:", cropData);

    // Convert the crop object to a string
    const cropString = JSON.stringify(cropData);
    console.log("Crop Data as String:", cropString);

    toggleLoader(); // Show loader

    fetch("/images/updateImgCrop", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: idDB, crop: cropString }), // Send crop as a string
    })
        .then((response) => {
            toggleLoader(); // Hide loader
            if (response.status !== 200) {
                console.error("Error saving crop data:", response.statusText);
                return alert("⚠ Si è verificato un errore durante il salvataggio del ritaglio");
            }
            console.log("Crop data saved successfully");

            // Display a success message or update the UI
            alert("✅ Ritaglio salvato con successo!");
            // You can also update the UI here if needed
        })
        .catch((error) => {
            toggleLoader(); // Hide loader
            console.error("Fetch error:", error);
            alert("⚠ Si è verificato un errore durante il salvataggio del ritaglio");
        });
}

function applyPhoneImg(idDB, value) {
    toggleLoader();
    fetch("/images/updateImgPhone", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: idDB, applyPhone: value })
    }).then((r) => {
        toggleLoader();
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento della foto",
        );
        return window.location.reload(false)
    });
}

function rotateLeft(newId, idDB, imgEl, rotateButton) {
    if (rotateButton.classList.contains("btn-primary")) {
        rotateButton.setAttribute("class", "btn btn-warning");
        croppers[newId] = new Cropper(imgEl, {
            viewMode: 0,
            dragMode: "none", // Disable cropping
            autoCrop: false,  // Disable automatic crop box
            cropBoxResizable: false, // Disable resizing
            cropBoxMovable: false,   // Disable moving
        });
        return;
    };

    // Rotate the image to the left by 90 degrees
    croppers[newId].rotate(-90); // Negative value for left rotation

    // Optionally, you can get the updated cropped canvas if needed
    const canvas = croppers[newId].getCroppedCanvas();

    // Destroy the cropper after use
    croppers[newId].destroy();

    // Convert the canvas to a Blob and update the image source
    canvas.toBlob(b => {
        document.querySelector(`#${newId} img`).src = URL.createObjectURL(b);
        enablePicsUpdate();
    });

    rotateButton.setAttribute("class", "btn btn-primary");
}
async function movePicLeft(picId) {
    console.log("Initial picIds:", picIds);

    var parentElement = document.getElementById(picId).parentElement;
    var picToMove = document.getElementById(picId);

    var picPosition = -1;

    // Find the current position of the image in picIds array
    for (var i = 0; i <= picIds.length; i++) {
        if (picId == picIds[i]) {
            picPosition = i;
            break;
        }
    }
    console.log(`Moving picId ${picId} from position`, picPosition);

    if (picPosition > -1) {
        picToMove.remove();

        let updates = []; // Array to store updates for the database

        if (picPosition == 0) {
            // Move to the last position
            insertAtLastPosition(picToMove, parentElement.lastElementChild);
            picIds.splice(picPosition, 1);
            picIds.push(picId);
            console.log(`Moved picId ${picId} to the last position`);

            // Update the moved image
            const idDB = picToMove.getAttribute("data-id");
            const origin = picToMove.getAttribute("data-origin");
            const newOrigin = updateOriginFilename(origin, picIds.length - 1); // New filename
            if (newOrigin !== null) {
                updates.push({
                    id: idDB,
                    origin: newOrigin,
                });
            }

            // Update the image that was previously last
            const lastPicId = picIds[picIds.length - 2];
            const lastPicElement = document.getElementById(lastPicId);
            const lastIdDB = lastPicElement.getAttribute("data-id");
            const lastOrigin = lastPicElement.getAttribute("data-origin");
            const lastNewOrigin = updateOriginFilename(lastOrigin, picIds.length - 2); // New filename
            if (lastNewOrigin !== null) {
                updates.push({
                    id: lastIdDB,
                    origin: lastNewOrigin,
                });
            }
        } else {
            // Swap with the previous image
            var moveAfter = document.getElementById(picIds[picPosition - 1]);
            insertBefore(picToMove, moveAfter);
            picIds.splice(picPosition, 1);
            picIds.splice(picPosition - 1, 0, picId);
            console.log(`Moved picId ${picId} to position ${picPosition - 1}`);

            // Update the moved image
            const idDB = picToMove.getAttribute("data-id");
            const origin = picToMove.getAttribute("data-origin");
            const newOrigin = updateOriginFilename(origin, picPosition - 1); // New filename
            if (newOrigin !== null) {
                updates.push({
                    id: idDB,
                    origin: newOrigin,
                });
            }

            // Update the image that was swapped
            const swappedIdDB = moveAfter.getAttribute("data-id");
            const swappedOrigin = moveAfter.getAttribute("data-origin");
            const swappedNewOrigin = updateOriginFilename(swappedOrigin, picPosition); // New filename
            if (swappedNewOrigin !== null) {
                updates.push({
                    id: swappedIdDB,
                    origin: swappedNewOrigin,
                });
            }
        }

        // Send updates to the backend
        console.log("Prepared updates:", updates); // Log the updates array
        if (updates.length > 0) {
            try {
                console.log("Sending updates to the backend:", updates); // Log the updates
                const response = await fetch("/updateImageIndex", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updates),
                });

                console.log("Response status:", response.status); // Log the response status

                if (!response.ok) {
                    throw new Error("Failed to update image origins");
                }

                console.log("Image origins updated successfully in the database");
            } catch (error) {
                console.error("Error updating image origins:", error);
            }
        } else {
            console.log("No updates to send"); // Log if updates array is empty
        }
    }
    console.log("Updated picIds:", picIds);
}

async function movePicRight(picId) {
    console.log("Initial picIds:", picIds);

    var picToMove = document.getElementById(picId);

    var picPosition = -1;

    // Find the current position of the image in picIds array
    for (var i = 0; i <= picIds.length; i++) {
        if (picId == picIds[i]) {
            picPosition = i;
            break;
        }
    }
    console.log(`Moving picId ${picId} from position`, picPosition);

    if (picPosition > -1) {
        picToMove.remove();

        let updates = []; // Array to store updates for the database

        if (picPosition == picIds.length - 1) {
            // Move to the first position
            var moveAfter = document.getElementById(picIds[0]);
            insertBefore(picToMove, moveAfter);
            picIds.splice(picPosition, 1);
            picIds.splice(0, 0, picId);
            console.log(`Moved picId ${picId} to the first position`);

            // Update the moved image
            const idDB = picToMove.getAttribute("data-id");
            const origin = picToMove.getAttribute("data-origin");
            const newOrigin = updateOriginFilename(origin, 0); // New filename
            if (newOrigin !== null) {
                updates.push({
                    id: idDB,
                    origin: newOrigin,
                });
            }

            // Update the image that was previously first
            const firstPicId = picIds[1];
            const firstPicElement = document.getElementById(firstPicId);
            const firstIdDB = firstPicElement.getAttribute("data-id");
            const firstOrigin = firstPicElement.getAttribute("data-origin");
            const firstNewOrigin = updateOriginFilename(firstOrigin, 1); // New filename
            if (firstNewOrigin !== null) {
                updates.push({
                    id: firstIdDB,
                    origin: firstNewOrigin,
                });
            }
        } else {
            // Swap with the next image
            var moveAfter = document.getElementById(picIds[picPosition + 1]);
            insertAfter(picToMove, moveAfter);
            picIds.splice(picPosition, 1);
            picIds.splice(picPosition + 1, 0, picId);
            console.log(`Moved picId ${picId} to position ${picPosition + 1}`);

            // Update the moved image
            const idDB = picToMove.getAttribute("data-id");
            const origin = picToMove.getAttribute("data-origin");
            const newOrigin = updateOriginFilename(origin, picPosition + 1); // New filename
            if (newOrigin !== null) {
                updates.push({
                    id: idDB,
                    origin: newOrigin,
                });
            }

            // Update the image that was swapped
            const swappedIdDB = moveAfter.getAttribute("data-id");
            const swappedOrigin = moveAfter.getAttribute("data-origin");
            const swappedNewOrigin = updateOriginFilename(swappedOrigin, picPosition); // New filename
            if (swappedNewOrigin !== null) {
                updates.push({
                    id: swappedIdDB,
                    origin: swappedNewOrigin,
                });
            }
        }

        // Send updates to the backend
        console.log("Prepared updates:", updates); // Log the updates array
        if (updates.length > 0) {
            try {
                console.log("Sending updates to the backend:", updates); // Log the updates
                const response = await fetch("/updateImageIndex", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updates),
                });

                console.log("Response status:", response.status); // Log the response status

                if (!response.ok) {
                    throw new Error("Failed to update image origins");
                }

                console.log("Image origins updated successfully in the database");
            } catch (error) {
                console.error("Error updating image origins:", error);
            }
        } else {
            console.log("No updates to send"); // Log if updates array is empty
        }
    }
    console.log("Updated picIds:", picIds);
}

function restoreImgButton(newId, idDB, imgEl, editButton) {
    toggleLoader();
    var tmpImg = $("#" + newId + "removed").clone();
    tmpImg.attr("id", newId.replace("removed", ""));
    $(tmpImg).appendTo(".persistent");
    tmpImg.find(".pic-operations .btn-danger").on("click", () => { deleteImgButton(newId, idDB, imgEl, editButton) });
    tmpImg.find(".pic-operations .btn-primary").on("click", () => { editImgButton(newId, idDB, imgEl, editButton) });
    tmpImg.find(".pic-operations .btn-success").on("click", () => { restoreImgButton(newId, idDB, imgEl, editButton) });
    fetch("/images/restoreImg", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: idDB })
    }).then((r) => {
        toggleLoader();
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento della foto",
        );
        document.querySelector("#" + newId + "removed").remove();
        enablePicsUpdate();
    });
}

function deleteImgButton(newId, idDB, imgEl, editButton) {
    toggleLoader();
    var tmpImg = $("#" + newId).clone();
    tmpImg.attr("id", newId + "removed");
    $(tmpImg).appendTo(".removed");
    tmpImg.find(".pic-operations .btn-danger").on("click", () => {
        //deleteImgButton(newId, idDB, imgEl, editButton);
        removeImgBtn(idDB, imgEl);
    });
    tmpImg.find(".pic-operations .btn-primary").on("click", () => { editImgButton(newId, idDB, imgEl, editButton) });
    tmpImg.find(".pic-operations .btn-success").on("click", () => { restoreImgButton(newId, idDB, imgEl, editButton) });
    fetch("/images/romoveImg", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ id: idDB })
    }).then((r) => {
        toggleLoader();
        if (r.status !== 200) return alert(
            "⚠ Si è verificato un errore durante il caricamento della foto",
        );
        document.querySelector("#" + newId).remove();
        enablePicsUpdate();
    });
}

async function editImgButton(newId, idDB, imgEl, editButton) {
    if (editButton.classList.contains("btn-primary")) {
        console.log(`Entering edit mode for image with ID: ${newId}`);

        // Set the image source in the modal
        const modalImage = document.getElementById("modalImage");
        modalImage.src = imgEl.src;

        // Get the custom modal and its elements
        const customModal = document.getElementById("customModal");
        const closeModalButton = document.getElementById("closeModalButton");
        const saveCropButton = document.getElementById("saveCropButton");

        // Show the modal
        customModal.style.display = "block";

        // Fetch the saved crop data from the server
        let savedCropData = null;
        try {
            const response = await fetch(`/images/getImgCrop/${idDB}`);
            if (!response.ok) {
                throw new Error("Failed to fetch crop data");
            }
            const data = await response.json();
            savedCropData = data.crop ? JSON.parse(data.crop) : null; // Parse the crop data
        } catch (error) {
            console.error("Error fetching crop data:", error);
        }

        // Initialize Cropper.js inside the modal
        let cropper;
        cropper = new Cropper(modalImage, {
            viewMode: 1, // Ensure the crop box stays within the image boundaries
            dragMode: "move",
            autoCropArea: 1, // Ensure the entire image is visible initially
            aspectRatio: 2 / 3, // Set a vertical aspect ratio (2:3)
            ready() {
                // If saved crop data exists, set the crop box to the saved coordinates
                if (savedCropData) {
                    this.cropper.setData({
                        x: savedCropData.x,
                        y: savedCropData.y,
                        width: savedCropData.dx - savedCropData.x,
                        height: savedCropData.dy - savedCropData.y,
                    });
                }
            },
        });

        // Handle the "Close" button click
        closeModalButton.onclick = () => {
            customModal.style.display = "none";
            if (cropper) {
                cropper.destroy(); // Destroy the Cropper instance
            }
        };

        // Handle the "Save Crop" button click
        saveCropButton.onclick = () => {
            if (!cropper) {
                console.error("Cropper instance not found.");
                return;
            }

            // Get crop data (coordinates)
            // Get the original and displayed dimensions of the image
            const originalWidth = modalImage.naturalWidth; // Original width
            const originalHeight = modalImage.naturalHeight; // Original height
            const displayedWidth = modalImage.width; // Displayed width
            const displayedHeight = modalImage.height; // Displayed height

            // Calculate scaling factors
            const scaleX = originalWidth / displayedWidth;
            const scaleY = originalHeight / displayedHeight;

            // Get crop data (coordinates relative to the displayed image)
            const cropData = cropper.getData();

            // Scale the crop coordinates to match the original image dimensions
            const scaledCropData = {
                x: cropData.x * scaleX,
                y: cropData.y * scaleY,
                width: cropData.width * scaleX,
                height: cropData.height * scaleY,
            };

            // Ensure the crop box maintains the 2/3 aspect ratio
            const targetAspectRatio = 2 / 3;
            const currentAspectRatio = scaledCropData.width / scaledCropData.height;

            if (currentAspectRatio !== targetAspectRatio) {
                // Adjust the width or height to enforce the 2/3 aspect ratio
                if (currentAspectRatio > targetAspectRatio) {
                    // If the crop box is too wide, adjust the height
                    scaledCropData.height = scaledCropData.width / targetAspectRatio;
                } else {
                    // If the crop box is too tall, adjust the width
                    scaledCropData.width = scaledCropData.height * targetAspectRatio;
                }
            }

            // Round the coordinates to the nearest integer
            const transformedCropData = {
                x: Math.round(scaledCropData.x), // Top-left x
                y: Math.round(scaledCropData.y), // Top-left y
                dx: Math.round(scaledCropData.x + scaledCropData.width), // Bottom-right x
                dy: Math.round(scaledCropData.y + scaledCropData.height), // Bottom-right y
            };

            console.log("Transformed Crop Data:", transformedCropData);

            // Destroy the cropper instance
            cropper.destroy();

            // Hide the modal
            customModal.style.display = "none";

            // Update the button state
            editButton.setAttribute("class", "btn btn-primary");

            // Pass the transformed crop data to the applyImageCrop function
            applyImageCrop(idDB, transformedCropData);
        };

        return;
    }

    console.log(`Exiting edit mode and saving crop data for image with ID: ${newId}`);
    const cropper = croppers[newId];
    if (!cropper) {
        console.error("Cropper instance not found.");
        return;
    }

    // Get the original and displayed dimensions of the image
    const originalWidth = modalImage.naturalWidth; // Original width
    const originalHeight = modalImage.naturalHeight; // Original height
    const displayedWidth = modalImage.width; // Displayed width
    const displayedHeight = modalImage.height; // Displayed height

    // Calculate scaling factors
    const scaleX = originalWidth / displayedWidth;
    const scaleY = originalHeight / displayedHeight;

    // Get crop data (coordinates relative to the displayed image)
    const cropData = cropper.getData();

    // Scale the crop coordinates to match the original image dimensions
    const scaledCropData = {
        x: cropData.x * scaleX,
        y: cropData.y * scaleY,
        width: cropData.width * scaleX,
        height: cropData.height * scaleY,
    };

    // Ensure the crop box maintains the 2/3 aspect ratio
    const targetAspectRatio = 2 / 3;
    const currentAspectRatio = scaledCropData.width / scaledCropData.height;

    if (currentAspectRatio !== targetAspectRatio) {
        // Adjust the width or height to enforce the 2/3 aspect ratio
        if (currentAspectRatio > targetAspectRatio) {
            // If the crop box is too wide, adjust the height
            scaledCropData.height = scaledCropData.width / targetAspectRatio;
        } else {
            // If the crop box is too tall, adjust the width
            scaledCropData.width = scaledCropData.height * targetAspectRatio;
        }
    }

    // Round the coordinates to the nearest integer
    const transformedCropData = {
        x: Math.round(scaledCropData.x), // Top-left x
        y: Math.round(scaledCropData.y), // Top-left y
        dx: Math.round(scaledCropData.x + scaledCropData.width), // Bottom-right x
        dy: Math.round(scaledCropData.y + scaledCropData.height), // Bottom-right y
    };

    console.log("Transformed Crop Data:", transformedCropData);

    // Destroy the cropper instance
    cropper.destroy();
    delete croppers[newId];

    // Update the button state
    editButton.setAttribute("class", "btn btn-primary");

    // Pass the transformed crop data to the applyImageCrop function
    applyImageCrop(idDB, transformedCropData);
}
