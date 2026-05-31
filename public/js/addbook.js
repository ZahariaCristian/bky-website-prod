const URL_PARAMS = new URLSearchParams(window.location.search);
const QUERY_CLIENT = URL_PARAMS.get("c");
$(()=>{
    setTimeout(() => {
        toggleLoader();
        fetch("/addbook/getClients", {
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
                return alert("❌ Si è verificato un errore durante il caricamento della rubrica.");
            }
            r.json().then(async (res) => {
                res.rows.forEach(data => loadClients(data));
                var firstRow = $("#rptClienti").find(".rptItemClienti")[1];
                var id = $(firstRow).find(".media").data("id");
                if(QUERY_CLIENT){
                    activeByID(parseInt(QUERY_CLIENT));
                    setTimeout(() => {
                        $("#rptClienti").animate({
                            scrollTop: $(".rptItemClienti.active").offset().top - 300
                        }, 'fast');
                    }, 300);
                }else{
                    activeByID(id);
                }
                $(".rptItemClienti").on("click", (x)=>{
                    $(".rptItemClienti.active").removeClass("active");
                    $(x.currentTarget).addClass("active");
                    loadDataRow();
                });
            });
        });
    });
});

var activeByID = (id) =>{
    $(".rptItemClienti.active").removeClass("active");
    var item = null;
    $("#rptClienti .rptItemClienti").each((i, x) =>{
        var itemID = $(x).find(".media").data("id");
        if(itemID == id) return item = $(x);
    });
    if (item != null){
        item.addClass("active");
        loadDataRow();
    }
}

var loadClients = (data) =>{
    $("#rptClienti .rptNoData").hide();
    var root = $("#rptClienti");
    var row = $(root).find(".rptItemClienti").first();
    var newRow = row.clone().removeAttr("style");

    $(newRow).html($(newRow).html().replace(/@id@/g, data.id));
    $(newRow).html($(newRow).html().replace(/@nome@/g, data.name));
    $(newRow).html($(newRow).html().replace(/@telefono@/g, data.phone));
    $(newRow).html($(newRow).html().replace(/@citta@/g, data.city));
    $(newRow).html($(newRow).html().replace(/@foto@/g, `${data.tblGalleria[0].src}&id=${data.tblGalleria[0].id}`));

    newRow.appendTo(root);
}

var loadDataRow = () => {
    var activeRow = $("#rptClienti").find(".active");
    var id = $(activeRow).find(".media").data("id");
    $(".custom-loader").show();
    fetch("/addbook/get", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({id: id})
    }).then((r) => {
        $(".custom-loader").hide();
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento della rubrica.");
        }
        r.json().then(async (res) => {
            $("#txtName").html("<i class='fa fa-link text-medium'></i> " + res.name);
            $("#txtAge").text(res.years);
            $("#txtCity").text(res.city);
            $("#txtPhone").text(res.phone);
            $("#imgPhoto").attr("src", `${res.tblGalleria[0].src}&id=${res.tblGalleria[0].id}`);
            $("#rptStorico .rptNoData").show();
            $(".rptItemStorico:gt(0)").remove();
            $(".btnDelete").attr("onclick", `deleteClient(${res.id})`);
            res.tblStoricoPagamentis.forEach( storico =>{
                loadStorico(storico);
            });
            var totRestanti = 0;
            var totS = 0;
            var totCrediti = 0;
            res.tblAnnuncis.forEach( a =>{
                totS = totS + a.tblSchedulazionis.length;
                totCrediti = totCrediti + (a.cost - a.payed);
                $("#btnGoTo").attr("href", "/annuncio.html?edit=" + a.id);
                a.tblSchedulazionis.forEach( s =>{
                    if(s.GCRecord == null && s.state == null && Date.parse(s.data) > Date.now()) totRestanti++;
                });
            });
            $("#txtTotaleRestanti").text(totRestanti);
            if (totRestanti == 0){
                $("#txtTotaleRestanti").addClass("text-danger");
            }else{
                $("#txtTotaleRestanti").removeClass("text-danger")
            }
            $("#txtTotalePubblicati").text(totS);
            $("#txtCrediti").text(totCrediti);
            if (totCrediti > 0){
                $("#txtCrediti").addClass("text-danger");
            }else{
                $("#txtCrediti").removeClass("text-danger")
            }
        });
    });
}

var loadStorico = (data) =>{
    $("#rptStorico .rptNoData").hide();
    var root = $("#rptStorico");
    var row = $(root).find(".rptItemStorico").first();
    var newRow = row.clone().removeAttr("style");

    $(newRow).html($(newRow).html().replace(/@importo@/g, data.importo));

    $(newRow).html($(newRow).html().replace(/@ora@/g, /(^.*?\:.*?)\:/g.exec(data.createdAt.split("T")[1])[1]));
    $(newRow).html($(newRow).html().replace(/@data@/g, data.createdAt.split("T")[0]));

    newRow.appendTo(root);
}

$("#txtSearch").keyup(()=>{
    $(".rptItemClienti").show();
    $(".rptItemClienti").first().hide();
    if($("#txtSearch").val().length > 2){
        var found = false;
        $(".rptItemClienti").each((i, x)=>{
            if($(x).text().toLowerCase().indexOf($("#txtSearch").val().toLowerCase()) == -1){
                $(x).hide();
            }else{
                found = true;
            }
        });
        if (!found){
            $(".rptNoData").show();
        }else{
            $(".rptNoData").hide();
        }
    }else{
        $(".rptNoData").hide();
    }
});

var deleteClient = (id)=>{
    if(confirm(`Sei sicuro di voler eliminare il cliente da BKY?`)){
        $(".custom-loader").show();
        fetch("/addbook/deleteClient", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({id: id})
        }).then((r) => {
            $(".custom-loader").hide();
            if (r.status == 401){
                window.location.href = "/";
            }else if(r.status !== 200) {
                return alert("❌ Si è verificato un errore durante il l'eliminazione del cliente.");
            }else if(r.status == 200){
                location.reload();
            }
        });
    }    
};