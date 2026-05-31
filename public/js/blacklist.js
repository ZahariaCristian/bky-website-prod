$(()=>{
    setTimeout(() => {
        toggleLoader();
        fetch("/blacklist/get", {
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
                return alert("❌ Si è verificato un errore durante il caricamento delle parola in black list.");
            }
            r.json().then(async (res) => {
                res.rows.forEach(data => loadBlackList(data));
                $("#rptBlackList .edited:gt(0)").removeClass("edited");
                $("#rptBlackList .edit-input").each((i, inp)=>{
                    var lbl = $(inp).parent().find("label");
                    $(lbl).text(inp.value);
                    $(lbl).on("click",(e)=>{
                        var item = $(e.target).parents(".rptItemBlackList");
                        item.addClass("edited");
                    });
                });
            });
        });
    }, 100);
 });

var loadBlackList = (data)=>{
    $(".rptNoData").hide();
    var root = $("#rptBlackList");
    var row = $(root).find(".rptItemBlackList").first();
    var newRow = row.clone().removeAttr("style");

    $(newRow).find('input[fieldName="id"]').attr("value", data.id);
    $(newRow).find('input[fieldName="text"]').attr("value", data.text);
    $(newRow).find('select[fieldName="typeMatch"] option').prop('selected', false);
    $(newRow).find('select[fieldName="target"] option').prop('selected', false);
    $(newRow).find(`select[fieldName="typeMatch"] option[value="${data.typeMatch}"]`).prop('selected', true);
    $(newRow).find(`select[fieldName="target"] option[value="${data.target}"]`).prop('selected', true);

    $(newRow).find('label[fieldName="text"]').text(data.text);
    $(newRow).find('label[fieldName="typeMatch"]').text(data.typeMatch);
    $(newRow).find('label[fieldName="target"]').text(data.target);

    newRow.appendTo(root);
}

$("#btnAddBlackList").on("click", ()=>{
    $(".rptNoData").hide();
    var root = $("#rptBlackList");
    var row = $(root).find(".rptItemBlackList").first();
    var newRow = row.clone().removeAttr("style");

    newRow.appendTo(root);
 });

 $("#btnUpdateBlackList").on("click", ()=>{
    toggleLoader();
    fetch("/blacklist/update", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({rows: getRowsEdited("#rptBlackList")})
    }).then((r) => {
        toggleLoader();
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante l'aggiornamento della BlackList.");
        }
        r.json().then(async (res) => {
            $(res).each((i, x)=>{
                $(`input[fieldName="id"][value="${x.id}"]`).attr("value", x.id);
            });
            ShowAlert("lblSaved");
        });
    });

    $("#rptBlackList .edited:gt(0)").removeClass("edited");
    $("#rptBlackList .edit-input").each((i, inp)=>{
        var lbl = $(inp).parent().find("label");
        $(lbl).text(inp.value);
        $(lbl).on("click",(e)=>{
            var item = $(e.target).parents(".rptItemBlackList");
            item.addClass("edited");
        });
    });
    $("#rptBlackList .edit-select").each((i, inp)=>{
        var lbl = $(inp).parent().find("label");
        var cmb = $(inp).find("option:selected");
        $(lbl).text(cmb[0].value);
        $(lbl).on("click",(e)=>{
            var item = $(e.target).parents(".rptItemBlackList");
            item.addClass("edited");
        });
    });
    //window.location.reload();
 });

 var deleteThis = (me)=>{
    var item = $(me).parents(".rptItemBlackList");
    item.addClass("edited");
    item.hide();
    var removeThis = item.find('input[fieldName="removeThis"]');
    removeThis.val(1);
 }

 var getRowsEdited = (rptSelector)=>{
    var data = new Array;
    var root = $(rptSelector);
    var rows = root.find(".edited:gt(0)");
    rows.each((i, row)=>{
        var rowData = {};
        $(row).find("input, select").each((it, data)=>{
            rowData[$(data).attr("fieldName")] = $(data).val();
        });
        data.push(rowData);
    })
    return data;
 }