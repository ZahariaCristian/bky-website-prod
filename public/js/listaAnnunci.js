const dateInput = document.querySelector("input[type='date']");
const DAY = new URLSearchParams(window.location.search).get("day");
if (DAY) 
    dateInput.value = DAY;
else
    dateInput.value = new Date().toLocaleDateString("zh-hans-cn", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).replace(/\//g, "-");

dateInput.addEventListener("change", () => {
    window.location.href = "/listaAnnunci.html?day=" + dateInput.value;
});
setTimeout(() => {
    loadList();
    setInterval(() => {
        $(".advertisement").remove();
        loadList();
    }, 60000);
}, 100);

function loadList(){
    fetch("/annuncio/advertisements", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ day: dateInput.value }),
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante il caricamento degli annunci.");
        }
        
        r.json().then(async (res) => {
            //LISTINO PREZZI BAKECAINCONTRII
            var oneXone = 30;
            var oneXthree = 60;
            var oneXseven = 120;
            var tenXone = 30;
            var tenXthree = 60;
            var tenXthree = 120;
            var top1, top3, top7, top10, top30 = 0;
            var creditiRestanti = parseInt($("#lblBKCredit").text().replace(".",""))
            $("#txtTotaleCrediti").text($("#lblBKCredit").text().replace(".",""));
            if (!res.length) {
                document.querySelector(".advertisementsWrapper").innerHTML = "";
                document.querySelector("#ads").innerHTML = "<h3>Nessun annuncio trovato in questa data.</h3>";
                $("#txtAnnunci").text("0");
                $("#txtAnnunciDaPub").text("0");
                $("#txtAnnunciFree").text("0");
                $("#txtAnnunciTop").text("0");
                return;
            }
            var annunciTotale = 0;
            var annunciFree = 0;
            var annunciDaPubblicare = 0;
            console.log("res",res);
            res.forEach(advInfo => {
                annunciTotale += 1;
                if (advInfo.typeAnnuncio == "Free"){
                    annunciFree += 1;
                }
                if (advInfo.state == null || advInfo.state == "ALERT"){
                    annunciDaPubblicare += 1;
                    costoCrediti = 0;
                    switch(advInfo.typeAnnuncio){
                        case "1x1":
                            costoCrediti = oneXone;
                        break;
                        case "1x3":
                            costoCrediti = oneXthree;
                        break;
                        case "1x7":
                            costoCrediti = oneXseven;
                        break;
                        case "10x1":
                            costoCrediti = tenXone;
                        break;
                        case "10x3":
                            costoCrediti = tenXthree;
                        break;
                        case "10x7":
                            costoCrediti = tenXseven;
                        break;
                    }
                    if (advInfo.hasPremium) costoCrediti = costoCrediti * 2;
                    creditiRestanti = creditiRestanti - costoCrediti;
                }
                console.log("advInfo",advInfo);
                switch(advInfo.state){
                    case "KO":
                        addAdvertisement(advInfo, "warning-ads");
                    break;
                    case "ALERT" || "EDIT":
                        addAdvertisement(advInfo, "current-ads");
                    break;
                    default:
                        addAdvertisement(advInfo, "ads");
                }

                $("#txtTotaleCreditiRimanenti").text(creditiRestanti);

                $("#txtAnnunci").text(annunciTotale);
                $("#txtAnnunciDaPub").text(annunciDaPubblicare);
                $("#txtAnnunciFree").text(annunciFree);
                $("#txtAnnunciTop").text((annunciTotale - annunciFree) + " TOP");
                
            });
        });

    });
}

function addAdvertisement (advInfo, target) {
    `{
        status: "green" (red, orange),
        phone: "3452648124",
        title: "TEST TITLE",
        description: "TEST DESCRIPTION",
        time: "13:02",
        city: "Livorno",
        promoType: "Free",
    }`
    const wrapper = document.createElement("div");
    wrapper.setAttribute("class", `widget advertisement ${advInfo.state}Adv`);
    const imgEl = document.createElement("img");
    imgEl.src = advInfo.Anteprima;
    const adInfoDiv = document.createElement("div");
    const description = advInfo.tblAnnunci.description.length < 570 ? advInfo.tblAnnunci.description : advInfo.tblAnnunci.description.substr(0, 570) + "...";
    const title = advInfo.tblAnnunci.title.length < 95 ? advInfo.tblAnnunci.title : advInfo.tblAnnunci.title.substr(0, 95) + "...";
    adInfoDiv.classList.add("adInfoo");
	console.log("Log listaAnnunci.js: " + advInfo.tblAnnunci.title, advInfo.tblAnnunci.description);
    if(advInfo.urlBK){
        adInfoDiv.innerHTML = `<div><a class="text-uppercase" href="/addbook.html?c=${advInfo.tblAnnunci.tblDonne.id}"><i class="fa fa-link"></i> ${advInfo.tblAnnunci.tblDonne.name}</a></div><h5>${title}</h5> <div><a class="btn btn-xs btn-success text-uppercase" target="_blank" href="${advInfo.urlBK}">${advInfo.platform || "BK"}</a></div>`;
    }else{
        adInfoDiv.innerHTML = `<div><a class="text-uppercase" href="/addbook.html?c=${advInfo.tblAnnunci.tblDonne.id}"><i class="fa fa-link"></i> ${advInfo.tblAnnunci.tblDonne.name}</a></div><h5>${title}</h5>
        <div><a class="btn btn-xs btn-success text-uppercase" target="_blank" href="#">${advInfo.platform || "bakecaincontrii"}</a></div>`;
    }
    const editPanelDiv = document.createElement("div");
    editPanelDiv.classList.add("editPanel");
    editPanelDiv.innerHTML = `
        <h5><u>${advInfo.tblAnnunci.tblDonne.phone}</u></h5>
        <h6>${advInfo.time}</h6>
        <h6>${advInfo.tblAnnunci.city}</h6>
        <h6>${advInfo.typeAnnuncio}</h6>
        <a class="btn btn-primary" href="/annuncio.html?edit=${advInfo.tblAnnunci.id}&day=${$("#dateSelector").val()}&panel=${advInfo.platform || "bakecaincontrii"}">Gestisci</a>
    `;
//<div class="widget-body label-danger" style="">Annuncio non pubblicato</div>
    const errorPanelDiv = document.createElement("div");
    errorPanelDiv.innerHTML = `<center><div class="widget-body label-danger" style="">Annuncio non pubblicato</div><center><br>`;

    const numeroBloccatoDiv = document.createElement("div");
    numeroBloccatoDiv.innerHTML = `<div class="widget-body label-danger" style="">Numero Bloccato</div>`;

    const annuncioSospesoDiv = document.createElement("div");
    annuncioSospesoDiv.innerHTML = `<div class="widget-body label-warning" style="">Annuncio Sospeso</div>`;

    if (advInfo.state == "KO") {
        const reactivateBtn = document.createElement("button");
        reactivateBtn.className = "btn btn-success btn-md mt-2";
        reactivateBtn.textContent = "Riprova Publicazione";

        reactivateBtn.onclick = async function() {
            console.log("Riattivazione annuncio", advInfo.id);
            try {
                const res = await fetch("/annuncio/reactivate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: advInfo.id })
                });
                if (res.status === 200) {
                    //alert("Annuncio riattivato!");
                    window.location.reload();
                } else {
                    alert("Errore nella riattivazione dell'annuncio.");
                }
            } catch (err) {
                alert("Errore di rete nella riattivazione.");
            }
        };
        errorPanelDiv.appendChild(reactivateBtn);
    }

    if(advInfo.Anteprima) wrapper.append(imgEl);
    wrapper.append(adInfoDiv);
    wrapper.append(editPanelDiv);
    if(advInfo.state == "KO") wrapper.append(errorPanelDiv);
    if(advInfo.state == "BLOCKED") wrapper.append(numeroBloccatoDiv);
    if(advInfo.state == "CLOSED") wrapper.append(annuncioSospesoDiv);

    document.querySelector("#" + target).append(wrapper);
};

function redirectToAdv (annuncio) {
    window.location.href = `/annuncio.html?edit=${annuncio}&day=${$("#dateSelector").val()}`;
};
