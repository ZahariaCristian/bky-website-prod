setTimeout(() => {
    toggleLoader();
    fetch("/team/getGroup", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    }).then((r) => {
        toggleLoader();
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento dei collaboratori.");
        }
        let i = 0;
        r.json().then(async (res) => {
            res.Users.forEach(user => rptUserIterator(user, i));
            i = i++;
        });
    });
}, 100);

var rptUserIterator = (user, i)=>{

    var root = $("#rptContainer");
    var row = $("#rptTemplate");
    var newRow;
    if(user.isMe){
        newRow = $("#pnlMe");
    }else{
        newRow = row.clone().show();
    }

    newRow.attr("id", "rptUser" + i);

    newRow.html(newRow.html().replace(/@nomeUtente@/g, user.userName));
    newRow.html(newRow.html().replace(/@mail@/g, user.mail));
    newRow.html(newRow.html().replace(/@annunci@/g, user.annunci));
    newRow.html(newRow.html().replace(/@OID@/g, user.OID));

    if(!user.isMe){
        $(newRow).appendTo(root);
        $(newRow).find(".btnDeleteMember").on("click", ()=>{
            let rConfirm = confirm("Sicuro di voler rimuovere l'utente dal tuo gruppo?");
            if(rConfirm){
                var targetID = event.target.dataset.user;
            fetch("/team/delete", {
                method: "POST",
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                referrerPolicy: "no-referrer",
                body: JSON.stringify({ targetID: targetID }),
            }).then((r) => {
                if (r.status == 401){
                    window.location.href = "/";
                }else if(r.status !== 200) {
                    return alert("❌ Si è verificato un errore durante la modifica del gruppo di lavoro.");
                }else if(r.status == 200){
                    $('.widget[data-user="' + targetID + '"]').parent().hide();
                    ShowAlert("lblSaved");
                }
            });
            }
        });
    }
};