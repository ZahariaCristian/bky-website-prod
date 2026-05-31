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
                    $("#inputMegaescortUserName").val(res.group?.megaescort?.username);
                    $("#inputTrovagnoccaUserName").val(res.group?.trovagnocca?.username);
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
            body: JSON.stringify({user: getInfoData(), group: getInfoDataBK(), bakecaGroup: getInfoDataBakeca(), megaescortGroup: getInfoDataMegaescort(), trovagnoccaGroup: getInfoDataTrovagnocca()})
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
        password: $("#inputBakecaUserPassword").val()
    }
}
var getInfoDataMegaescort = ()=>{
    return {
        username: $("#inputMegaescortUserName").val()
    }
}
var getInfoDataTrovagnocca = ()=>{
    return {
        username: $("#inputTrovagnoccaUserName").val(),
        password: $("#inputTrovagnoccaUserPassword").val()
    }
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
