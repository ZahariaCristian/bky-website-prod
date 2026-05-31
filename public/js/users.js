$(()=>{
    setTimeout(() => {
        toggleLoader();
        fetch("/users/get", {
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
                return alert("❌ Si è verificato un errore durante il caricamento degli utenti.");
            }
            r.json().then(async (res) => {
                res.users.forEach(data => loadUsers(data));
            });
        });
    }, 100);
 });

var loadUsers = (data)=>{
    $(".rptNoData").hide();
    var root = $("#rptUsers");
    var row = $(root).find(".rptItemUsers").first();
    var newRow = row.clone().removeAttr("style");

    $(newRow).html($(newRow).html().replace(/@OID@/g, data.OID));

    $(newRow).find('input[fieldName="id"]').attr("value", data.OID);
    $(newRow).find('input[fieldName="isActive"]').prop("checked", data.isActive);
    $(newRow).find('label[fieldName="userName"]').text(data.userName);
    $(newRow).find('label[fieldName="mail"]').text(data.mail);
    $(newRow).find('label[fieldName="tblUserRole.tblRole.name"]').text(data.tblUserRoles[0].tblRole.name);

    newRow.appendTo(root);
}