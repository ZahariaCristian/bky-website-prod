$("#btnUpdateCom").on("click", ()=>{
    fetch("/comunicazioni/post", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({message: $("#txtCom").val()})
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento delle comunicazioni.");
        }
        r.json().then(async (res) => {
            addComunicazione(res, res.admin);
            $("#txtCom").val("");
        });
    });
});

$(()=>{
    setTimeout(() => {
        fetch("/comunicazioni/get", {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
        }).then((r) => {
            if (r.status == 401){
                window.location.href = "/";
            }else if(r.status !== 200) {
                return alert("❌ Si è verificato un errore durante il caricamento delle comunicazioni.");
            }
            r.json().then(async (res) => {
                res.rows.forEach(message => addComunicazione(message, res.admin));
                if(res.admin) $("#txtAdminCom").show();
            });
        });
    }, 100);
})

function addComunicazione(message, admin){
    $(".rptNoData").hide();
    var root = $("#rptCom");
    var row = $(root).find(".rptItemCom").first();
    var newRow = row.clone().removeAttr("style");
    
    $(newRow).html($(newRow).html().replace(/@id@/g, message.id));
    $(newRow).html($(newRow).html().replace(/@userName@/g, message.tblUser.userName));
    $(newRow).html($(newRow).html().replace(/@time@/g, new Date(message.createdAt).toLocaleString()));
    $(newRow).html($(newRow).html().replace(/@text@/g, message.description));

    newRow.appendTo(root);
    if (admin) $(newRow).find("a").show();
}

function deleteThis(me, id){
    $(me).parents(".rptItemCom").remove();
    fetch("/comunicazioni/delete", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({id: parseInt(id)})
    })
}