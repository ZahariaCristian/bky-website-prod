// Set default dates (today and 30 days ago)
$(function() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    $("#reportStartDate").val(startDate.toISOString().split('T')[0]);
    $("#reportEndDate").val(endDate.toISOString().split('T')[0]);
    
    // Generate initial report
    generateCreditsReport();
});

document.getElementById('searchBox').addEventListener('keyup', function() {
    var searchTerm = this.value.toLowerCase(); // Convert input to lowercase
    var items = document.querySelectorAll('.rptItemCrediti');
    
    // Loop through each row and hide or show based on the search term
    items.forEach(function(item) {
        var name = item.querySelector('[fieldName="tblDonne.name"]').innerText.toLowerCase();
        var phone = item.querySelector('[fieldName="tblDonne.phone"]').innerText.toLowerCase();
        var title = item.querySelector('[fieldName="title"]').innerText.toLowerCase();

        // Show item if it matches search term
        if (name.includes(searchTerm) || phone.includes(searchTerm) || title.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

function generateCreditsReport() {
    const startDate = $("#reportStartDate").val();
    const endDate = $("#reportEndDate").val();
    
    if (!startDate || !endDate) {
        alert("Per favore seleziona entrambe le date");
        return;
    }
    
    toggleLoader();
    fetch(`/gestPagamenti/getCreditsUsedBetweenDates?startDate=${startDate}&endDate=${endDate}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    }).then((r) => {
        toggleLoader();
        if (r.status == 401) {
            window.location.href = "/";
        } else if (r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il recupero del report.");
        }
        return r.json();
    }).then(data => {
        $("#totalCreditsUsed").text(data.totalCredits.toLocaleString('it-IT'));
        $("#totalPaymentsReceived").text(data.totalPayments.toLocaleString('it-IT'));
        $("#netBalance").text(data.netUsage.toLocaleString('it-IT'));
        
        // Color coding for net balance
        const netBalanceElem = $("#netBalance");
        netBalanceElem.removeClass("text-success text-danger");
        if (data.netUsage > 0) {
            netBalanceElem.addClass("text-danger");
        } else if (data.netUsage < 0) {
            netBalanceElem.addClass("text-success");
        }
        
        $("#btnExportReport").show();
    }).catch(error => {
        console.error(error);
        alert("Si è verificato un errore durante la generazione del report");
    });
}

$("#btnGenerateReport").on("click", generateCreditsReport);

$("#btnExportReport").on("click", function() {
    const startDate = $("#reportStartDate").val();
    const endDate = $("#reportEndDate").val();
    
    window.open(`/gestPagamenti/exportCreditsReport?startDate=${startDate}&endDate=${endDate}`, '_blank');
});
 
 
 
var setValidations = (classSelector) =>{
    $(classSelector).each((i, inp) =>{
        setValidation(inp, function(value) {
            return /^\d*\.?\d*$/.test(value); // Allow digits with optional decimal point
          }, "Sono ammessi solo numeri (anche decimali).");
     });
 }

 $(()=>{
    setTimeout(() => {
        toggleLoader();
        fetch("/gestPagamenti/getCrediti", {
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
            if (r.status == 401){
                window.location.href = "/";
            }else if(r.status !== 200) {
                return alert("❌ Si è verificato un errore durante l'aggiornamento dei crediti.");
            }
            r.json().then(async (res) => {
                res.crediti.forEach(data => loadCrediti(data));
            });
        });


        fetch("/gestPagamenti/getListino", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            }
        }).then((r) => {
            if (r.status == 401) {
                window.location.href = "/";
            } else if (r.status !== 200) {
                return alert("Error loading listino");
            }
            return r.json();
        }).then(response => {
            console.log("Raw response:", response);
            // Handle both direct array response and wrapped response
            const data = Array.isArray(response) ? response : 
                        response.listino ? response.listino : 
                        [response];
            console.log("Data to load:", data);
            loadListino(data);
        }).catch(error => {
            console.error("Fetch error:", error);
        });



        fetch("/gestPagamenti/getListinoSuper", {
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
                return alert("❌ Si è verificato un errore durante l'aggiornamento del listino Super.");
            }
            r.json().then(async (res) => {
                res.listino.forEach(
                    function(data){
                        if (data.typeSuper == "SUPERTOP"){
                            loadSuperTop(data);
                        }else if(data.typeSuper == "VIDEO"){
                            loadVideoCall(data);
                        }
                    }
                );
            });
        });
    }, 100);
 });

var loadSuperTop = (data)=>{
    var root = $(".superTop");
    root.find('input[fieldName="id"]').attr("value", data.id);
    root.find('input[fieldName="oneXone"]').attr("value", data.oneXone);
    root.find('input[fieldName="oneXthree"]').attr("value", data.oneXthree);
    root.find('input[fieldName="oneXseven"]').attr("value", data.oneXseven);
    root.find('input[fieldName="tenXone"]').attr("value", data.tenXone);
    root.find('input[fieldName="tenXthree"]').attr("value", data.tenXthree);
    root.find('input[fieldName="tenXseven"]').attr("value", data.tenXseven);
    root.find('input[fieldName="tenXseven"]').attr("value", data.tenXseven);
    root.find('input[fieldName="supertop"]').attr("value", data.supertop);
    root.find('input[fieldName="highlight"]').attr("value", data.highlight);
    root.find('input[fieldName="etichetta"]').attr("value", data.etichetta);
    root.find('input[fieldName="supertopnotte"]').attr("value", data.supertopnotte);
    root.find('input[fieldName="highlightnotte"]').attr("value", data.highlightnotte);
    root.find('input[fieldName="etichettanotte"]').attr("value", data.etichettanotte);
    setValidations(".superTop .input-currency");
}

var loadVideoCall = (data)=>{

}

 var loadCrediti = (data)=>{
    $("#rptCrediti .rptNoData").hide();
    var root = $("#rptCrediti");
    var row = $(root).find(".rptItemCrediti").first();
    var newRow = row.clone().removeAttr("style");

    $(newRow).html($(newRow).html().replace(/@cliente@/g, data.donna));
    $(newRow).html($(newRow).html().replace(/@id@/g, data.id));

    $(newRow).find('input[fieldName="id"]').attr("value", data.id);
    $(newRow).find('input[fieldName="cost"]').attr("value", data.cost);
    $(newRow).find('input[fieldName="payed"]').attr("value", data.payed || 0);
    if(data.cost > data.payed){
        var inpPayed = $(newRow).find('input[fieldName="payed"]');
        $("<span class='input-group-addon' style='color:red'>!</span>").insertBefore(inpPayed);
        inpPayed.keyup((e)=>{
            if (e.target.value > data.cost) inpPayed.val(data.cost);
            if (inpPayed.val() >= data.cost){
                var spanB = inpPayed.prev();
                spanB.remove();
            }
            $(newRow).addClass("edited");
        });
    }

    $(newRow).find('label[fieldName="tblDonne.name"]').text(data.tblDonne.name);
    $(newRow).find('label[fieldName="tblDonne.phone"]').text(data.tblDonne.phone);
    $(newRow).find('label[fieldName="title"]').text(data.title);
    $(newRow).find('label[fieldName="cost"]').text(data.cost);

    newRow.appendTo(root);
    setValidations("#rptCrediti .input-currency");
}


$("#btnUpdateCrediti").on("click", ()=>{
    toggleLoader();
    fetch("/gestPagamenti/updateCredits", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({rows: getRowsEdited2("#rptCrediti")})
    }).then((r) => {
        toggleLoader();
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante l'aggiornamento dei crediti.");
        }
        $(('#rptCrediti input[fieldName="payed"]')).prop("disabled", true);
        ShowAlert("lblSaved");
        setTimeout(() => {
            location.reload(true);
        }, 1000);
    });
});

var getRowsEdited2 = (rptSelector)=>{
    var data = new Array;
    var root = $(rptSelector);
    var rows = root.find(".edited:gt(0)");
    rows.each((i, row)=>{
        var rowData = {};
        $(row).find("input").each((it, data)=>{
            rowData[$(data).attr("fieldName")] = $(data).val();
        });
        data.push(rowData);
    })
    console.log("Rows to save:", data);
    return data;
 }

var loadListino = (data) => {
    $("#rptCosti .rptNoData").hide();
    var root = $("#rptCosti");
    
    // First, ensure data is an array
    if (!Array.isArray(data)) {
        data = [data]; // Wrap single object in array
    }

    // Debug: Log the raw data
    console.log("Raw listino data:", data);
    
    // Organize the data by uscita
    var usciteMap = {};
    var maxUscita = 0;
    
    data.forEach(item => {
        if (!item || typeof item !== 'object') return;
        
        var uscita = item.uscita || 1;
        usciteMap[uscita] = {
            oneXone: item.oneXone || "0",
            oneXthree: item.oneXthree || "0",
            oneXseven: item.oneXseven || "0",
            tenXone: item.tenXone || "0",
            tenXthree: item.tenXthree || "0",
            tenXseven: item.tenXseven || "0",
            supertop: item.supertop || "0",
            highlight: item.highlight || "0",
            etichetta: item.etichetta || "0",
            supertopnotte: item.supertopnotte || "0",
            highlightnotte: item.highlightnotte || "0",
            etichettanotte: item.etichettanotte || "0",
            id: item.id || "0"
        };
        
        if (uscita > maxUscita) maxUscita = uscita;
    });

    // Debug: Log the processed data
    console.log("Processed usciteMap:", usciteMap);
    
    // Clear and rebuild the header
    $("#rptCosti thead tr").empty().append("<th>Uscite ></th>");
    
    // Add uscite columns to header
    for (let i = 1; i <= maxUscita; i++) {
        $("#rptCosti thead tr").append(`<th>${i}</th>`);
    }
    
    // Define our top types
    const topTypes = [
        { key: 'oneXone', label: 'Top 1x1' },
        { key: 'oneXthree', label: 'Top 1x3' },
        { key: 'oneXseven', label: 'Top 1x7' },
        { key: 'tenXone', label: 'Top 10x1' },
        { key: 'tenXthree', label: 'Top 10x3' },
        { key: 'tenXseven', label: 'Top 10x7' },
        { key: 'supertop', label: 'SuperTop' },
        { key: 'highlight', label: 'Highlight' },
        { key: 'etichetta', label: 'Etichetta' },
        { key: 'supertopnotte', label: 'SuperTop Notte' },
        { key: 'highlightnotte', label: 'Highlight Notte' },
        { key: 'etichettanotte', label: 'Etichetta Notte' }

    ];
    
    // Clear existing data rows (except template)
    $("#rptCosti tbody tr[data-type]").remove();
    
    // Create rows for each top type
    topTypes.forEach(typeInfo => {
        var row = $(`<tr class="rptItemCosti" data-type="${typeInfo.key}">`);
        row.append(`<td>${typeInfo.label}</td>`);
        
        // Add cells for each uscita
        for (let uscita = 1; uscita <= maxUscita; uscita++) {
            var value = (usciteMap[uscita] && usciteMap[uscita][typeInfo.key]) || "0";
            var id = (usciteMap[uscita] && usciteMap[uscita].id) || "0";
            
            row.append(`
                <td>
                    <input type="hidden" fieldName="id" uscita="${uscita}" value="${id}" />
                    <input type="hidden" class="txtUscite" value="${uscita}" />
                    <label class="control-label" fieldName="${typeInfo.key}" uscita="${uscita}">${value}</label>
                    <input type="text" class="form-control input-currency edit-input" 
                           fieldName="${typeInfo.key}" uscita="${uscita}" 
                           placeholder="0" value="${value}" style="display: none;">
                </td>
            `);
        }
        
        $("#rptCosti tbody").append(row);
    });
    
    setValidations("#rptCosti .input-currency");
    
    // Rebind click handlers
    $("#rptCosti .control-label").off("click").on("click", function() {
        $(this).hide();
        $(this).next(".edit-input").show().focus();
        $(this).closest("tr").addClass("edited");
    });
    
    $("#rptCosti .edit-input").off("blur").on("blur", function() {
        $(this).hide();
        $(this).prev(".control-label").text($(this).val()).show();
    });
};

function moveTotal(me){
    var row = $(me).parents(".rptItemCrediti");
    var inpPayed = $(row).find('input[fieldName="payed"]');
    inpPayed.val($(row).find('label[fieldName="cost"]').text());
    var spanB = inpPayed.prev();
    spanB.remove();
    $(row).addClass("edited");
}

// Modified add function
$("#btnAddListino").on("click", () => {
    var root = $("#rptCosti");
    var currentUsciteCount = $("#rptCosti thead tr th").length - 1; // Subtract the "Top Types" column
    
    if (currentUsciteCount < 20) {
        var newUscita = currentUsciteCount + 1;
        
        // Add new column header
        $("#rptCosti thead tr").append(`<th>${newUscita}</th>`);
        
        // Add new cell to each row
        $("#rptCosti tbody tr[data-type]").each(function() {
            $(this).append(`
                <td>
                    <input type="hidden" fieldName="id" uscita="${newUscita}" value="0" />
                    <input type="hidden" class="txtUscite" value="${newUscita}" />
                    <label class="control-label" fieldName="${$(this).data("type")}" uscita="${newUscita}">0</label>
                    <input type="text" class="form-control input-currency edit-input" 
                           fieldName="${$(this).data("type")}" uscita="${newUscita}" 
                           placeholder="0" value="0" style="display: none;">
                </td>
            `);
        });
        
        setValidations(".input-currency");
    } else {
        alert("Hai raggiunto il limite massimo di 20 uscite.");
    }
});

var getRowsEdited = (rptSelector) => {
    var changes = [];
    
    // Get all rows (not just edited ones)
    $(rptSelector).find("tr.rptItemCosti").each(function() {
        var type = $(this).data("type");
        
        $(this).find("td:not(:first)").each(function() {
            var input = $(this).find(".edit-input");
            var label = $(this).find(".control-label");
            var uscita = $(this).find(".txtUscite").val();
            var id = $(this).find('input[fieldName="id"]').val();
            
            // Always include the value (we'll filter empty ones later)
            changes.push({
                id: id,
                uscita: uscita,
                type: type,
                value: input.val()
            });
        });
    });
    
    return changes;
};

$("#btnUpdateLisno").on("click", async () => {
    toggleLoader();
    
    try {
        // Get all current values
        const allChanges = getRowsEdited("#rptCosti");
        
        // Group by uscita
        const usciteMap = {};
        allChanges.forEach(change => {
            if (!usciteMap[change.uscita]) {
                usciteMap[change.uscita] = {
                    id: change.id,
                    uscita: change.uscita,
                    oneXone: "0",
                    oneXthree: "0",
                    oneXseven: "0",
                    tenXone: "0",
                    tenXthree: "0",
                    tenXseven: "0",
                    supertop: "0",
                    highlight: "0",
                    etichetta: "0",
                    supertopnotte: "0",
                    highlightnotte: "0",
                    etichettanotte: "0"
                };
            }
            usciteMap[change.uscita][change.type] = change.value;
        });
        
        // Convert to array
        const rowsToUpdate = Object.values(usciteMap);
        console.log("Data to save:", rowsToUpdate);
        
        // Send to server
        const response = await fetch("/gestPagamenti/updateListino", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({rows: rowsToUpdate})
        });
        
        if (!response.ok) throw new Error("Server error");
        
        const result = await response.json();
        
        // Update IDs if any new rows were created
        result.forEach(updatedRow => {
            $(`#rptCosti input.txtUscite[value="${updatedRow.uscita}"]`)
                .siblings('input[fieldName="id"]')
                .val(updatedRow.id);
        });
        
        // Update all labels to match inputs
        $(".edit-input").each(function() {
            $(this).prev(".control-label").text($(this).val());
        });
        
        ShowAlert("lblSaved");
        
    } catch (error) {
        console.error("Save error:", error);
        alert("Errore durante il salvataggio: " + error.message);
    } finally {
        toggleLoader();
    }
});

var getRowsListino = ()=>{
    var data = new Array;
    var root = $(".super-listini");
    root.each((i, r)=>{
        var listino = {};
        $(r).find("input").each((it, data)=>{
            listino[$(data).attr("fieldName")] = $(data).val();
        });
        data.push(listino);
    });
    return data;
 }

$("#rptCosti").on("click", ".control-label", function() {
    $(this).hide();
    $(this).next(".edit-input").show().focus();
    $(this).closest("tr").addClass("edited");
});

// When finishing editing
$("#rptCosti").on("blur", ".edit-input", function() {
    $(this).hide();
    $(this).prev(".control-label").show();
});

    fetch("/gestPagamenti/updateListinoSuper", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({rows: getRowsListino()})
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante l'aggiornamento del listino Super.");
        }
    });

