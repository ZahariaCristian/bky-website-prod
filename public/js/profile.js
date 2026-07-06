$(()=>{
    setTimeout(()=>{
            toggleLoader();
            fetch("/profile/get", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer"
            }).then((r) => {
                toggleLoader();
                if (r.status == 401){
                    window.location.href = "/";
                }else if(r.status !== 200) {
                    return alert("❌ Si è verificato un errore durante il caricamento dell'utente.");
                }
                r.json().then(async (res) => {
                    $("#lblUser").text(res.user?.userName);
                    $("#inputUserName").val(res.user?.userName);
                    $("#inputUserMail").val(res.user?.mail)
                    $("#inputBKUserName").val(res.group?.bkUserName);
                    $("#inputBakecaUserName").val(res.group?.bakeca?.username);
                    setPlatformStatus("Bakeca", res.group?.bakeca?.status);
                    $("#inputMegaescortUserName").val(res.group?.megaescort?.username);
                    setPlatformStatus("Megaescort", res.group?.megaescort?.status);
                    $("#inputTrovagnoccaUserName").val(res.group?.trovagnocca?.username);
                    setPlatformStatus("Trovagnocca", res.group?.trovagnocca?.status);
                    $("#inputIncontriamociUserName").val(res.group?.incontriamoci?.username);
                    setPlatformStatus("Incontriamoci", res.group?.incontriamoci?.status);
                    $("#inputAmasensUserName").val(res.group?.amasens?.username);
                    setPlatformStatus("Amasens", res.group?.amasens?.status || "inactive");
                });
            });
    },100);
});

$("#btnCreaUtente").on("click",()=>{
    if(customValidation()){
        toggleLoader();
        fetch("/profile/edit", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({user: getInfoData(), group: getInfoDataBK(), bakecaGroup: getInfoDataBakeca(), megaescortGroup: getInfoDataMegaescort(), trovagnoccaGroup: getInfoDataTrovagnocca(), incontriamociGroup: getInfoDataIncontriamoci(), amasensGroup: getInfoDataAmasens()})
        }).then((r) => {
            toggleLoader();
            if(r.status !== 200){
                return alert("⚠ Si è verificato un errore durante la modifica dell'utente");
            }else{
                //window.location = "/users.html";
                ShowAlert("lblSaved");
            }
        });
    }
});

var getInfoData = ()=>{
    return {
        userName: $("#inputUserName").val(),
        password: $("#inputUserPassword").val(), 
        mail: $("#inputUserMail").val()
    }    
}
var getInfoDataBK = ()=>{
    return {
        bkUserName: $("#inputBKUserName").val(),
        bkPassword: $("#inputBKUserPassword").val()
    }
}
var getInfoDataBakeca = ()=>{
    return {
        username: $("#inputBakecaUserName").val(),
        password: $("#inputBakecaUserPassword").val(),
        status: getPlatformStatus("Bakeca")
    }
}
var getInfoDataMegaescort = ()=>{
    return {
        username: $("#inputMegaescortUserName").val(),
        status: getPlatformStatus("Megaescort")
    }
}
var getInfoDataTrovagnocca = ()=>{
    return {
        username: $("#inputTrovagnoccaUserName").val(),
        password: $("#inputTrovagnoccaUserPassword").val(),
        status: getPlatformStatus("Trovagnocca")
    }
}
var getInfoDataIncontriamoci = ()=>{
    return {
        username: $("#inputIncontriamociUserName").val(),
        password: $("#inputIncontriamociUserPassword").val(),
        status: getPlatformStatus("Incontriamoci")
    }
}
var getInfoDataAmasens = ()=>{
    return {
        username: $("#inputAmasensUserName").val(),
        password: $("#inputAmasensUserPassword").val(),
        status: getPlatformStatus("Amasens")
    }
}

var setPlatformStatus = (platformName, status)=>{
    $(`#input${platformName}Status`).prop("checked", (status || "active") === "active");
}

var getPlatformStatus = (platformName)=>{
    return $(`#input${platformName}Status`).is(":checked") ? "active" : "inactive";
}

var customValidation = ()=>{
    let valid = true;

    $(".form-group").removeClass("has-error");
    $(".has-error").remove();

    if($("#inputUserName").val().length < 5){
        var group = $("#inputUserName").parents(".form-group");
        group.addClass("has-error");
        group.append("<p class='has-error help-block'>Il nome deve contenere almeno 5 caratteri</p>");
        valid = false;
    }

    if($("#inputUserPassword").val().length < 8 && $("#inputUserPassword").val().length != 0){
        var group = $("#inputUserPassword").parents(".form-group");
        group.addClass("has-error");
        group.append("<p class='has-error help-block'>La password deve contenere almeno 8 caratteri</p>");
        valid = false;
    }

    if($("#inputUserPassword").val() != $("#inputTwoUserPassword").val() && $("#inputUserPassword").val().length != 0){
        var group = $("#inputTwoUserPassword").parents(".form-group");
        group.addClass("has-error");
        group.append("<p class='has-error help-block'>La password non corrisponde</p>");
        valid = false;
    }

    if($("#inputUserMail").val().indexOf("@") == -1 || $("#inputUserMail").val().indexOf(".") == -1){
        var group = $("#inputUserMail").parents(".form-group");
        group.addClass("has-error");
        group.append("<p class='has-error help-block'>La mail non è valida</p>");
        valid = false;
    }
    return valid;
}
