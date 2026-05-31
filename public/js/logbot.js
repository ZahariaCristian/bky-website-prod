setTimeout(() => {
    fetch("/logbot/logs", {
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
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento dei logs.");
        }
        
        r.json().then(async (res) => {
            if (!res.logs.length) {
                document.querySelector("#rptLog").innerHTML = "<h3>Nessun log trovato.</h3>";
                return;
            }
            res.logs.forEach(text => addLogToRpt(text));
        });
    });
}, 100);

var addLogToRpt = (text)=>{
    if(text.length > 0){
        var root = $("#rptLog");
        var row = $("#rptRow");
        var newRow = row.clone().show();
        if(text.indexOf("http") == 0){
            var newHref = document.createElement("a");
            $(newHref).text(text.substring(0, 40));
            newHref.href = text;
            $(newRow).find("p").html(newHref.outerHTML);
        }else{
            $(newRow).find("p").text(text);
        }
        $(newRow).appendTo(root);
    }
};