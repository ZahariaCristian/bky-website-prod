const URL_PARAMS = new URLSearchParams(window.location.search);
const QUERY_USER = URL_PARAMS.get("u");

$(()=>{
    setTimeout(()=>{
        var role;
        if(QUERY_USER){
            toggleLoader();
            fetch("/user/get", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify({ id: QUERY_USER })
            }).then((r) => {
                if (r.status == 401){
                    window.location.href = "/";
                }else if(r.status !== 200) {
                    alert("❌ Si è verificato un errore durante il caricamento dell'utente.");
                    window.location.href = "/Users.html";
                    return false;
                }
                r.json().then(async (res) => {
                    $("#lblUser").text(res.user.userName);
                    $("#inputUserName").attr("value", res.user.userName);
                    $("#inputUserMail").attr("value", res.user.mail);
                    if(!res.user.forceChangePassword){
                        $("#chkForceChangePass").prop('checked',false);
                        $("#chkForceChangePass").parent().removeClass("switch-on");
                        $("#chkForceChangePass").parent().addClass("switch-off");
                    }
                    if(!res.user.isActive){
                        $("#chkActive").prop('checked',false);
                        $("#chkActive").parent().removeClass("switch-on");
                        $("#chkActive").parent().addClass("switch-off");
                    }
                    role = res.user.role;

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
                                if(role == x.id){
                                    $("#cmbRole").val(x.id);
                                }
                            });
                        });
                    });

                });
            });
        }
    },100);
});

$("#btnCreaUtente").on("click",()=>{
    if(customValidation()){
        toggleLoader();
        fetch("/user/edit", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({user: getInfoData()})
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
        OID: QUERY_USER,
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

    if($("#inputUserPassword").val().length < 8 && $("#inputUserPassword").val().length != 0){
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