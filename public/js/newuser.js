$("#btnCreaUtente").on("click",()=>{
    if(customValidation()){
        toggleLoader();
        fetch("/newUser/new", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({user: getInfoData()}),
        }).then((r) => {
            toggleLoader();
            if (r.status == 402){
                var group = $("#inputUserName").parents(".form-group");
                group.addClass("has-error");
                group.append("<p class='has-error help-block'>Il nome utente scelto, risulta già registrato</p>");
                return ShowAlert("custom", "⚠ Il nome utente scelto, risulta già registrato");//alert("⚠ Il nome utente scelto, risulta già registrato");
            }else if(r.status !== 200){
                return alert("⚠ Si è verificato un errore durante la creazione dell'utente");
            }else{
                window.location = "/users.html";
            }
        });
    }
});

var getInfoData = ()=>{
    return {
        userName: $("#inputUserName").val(),
        password: $("#inputUserPassword").val(), 
        mail: $("#inputUserMail").val(),
        forceChangePassword: $("#chkForceChangePass").is(':checked'),
        isActive: $("#chkActive").is(':checked'),
        role: $("#cmbRole").val()
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

    if($("#inputUserPassword").val().length < 8){
        var group = $("#inputUserPassword").parents(".form-group");
        group.addClass("has-error");
        group.append("<p class='has-error help-block'>La password deve contenere almeno 8 caratteri</p>");
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

$(()=>{
    setTimeout(() => {
        toggleLoader();
        fetch("/newUser/getRole", {
            method: "GET",
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
                alert("❌ Si è verificato un errore durante il caricamento dei ruoli.");
                return false;
            }
            r.json().then(async (res) => {
                $(res.roles).each((i, x)=>{
                    $("#cmbRole").append($('<option>', {
                        value: x.id,
                        text: x.name
                    }));
                    if(x.name == "User"){
                        $("#cmbRole").val(x.id);
                    }
                });
            });
        });
    }, 100);
})