$(()=>{
    var menu = $("#sidebar-discover-wrapper");
    var mli = $(menu).find("ul li");
    var li;
    $(mli).each((i, x)=>{
            var ali = $(x).find("a")[0];
            var href = "";
            var aliTarget = ali.attributes.href.value;
            if(aliTarget.indexOf("?") != -1){
                var rEx = new RegExp(/.*?\?/g);
                href = rEx.exec(aliTarget)[0];
                href = href.substring(0, href.length - 1);
            }else{
                href = aliTarget;
            }
            if(href == window.location.pathname){
                li = $(ali).parent("li");
            }
    });
    if(li){
            $(li).addClass("active");
            var pathli = $(li).parents("div")[0].id;
            var ali = $("a[href='#" + pathli + "']")[0];
            if(ali){
                $(ali).parent().addClass("active");
                window.openDiscover(ali);
            }            
    }
    GetBKCredit();
    getBKUsername();
    SetNavigator();
});

document.addEventListener("DOMContentLoaded", function() {
  // If we're on the comunicazioni page, mark all as read
  if (window.location.pathname.includes('comunicazioni.html')) {
      fetch('/comunicazioni/mark-as-read', { 
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          }
      }).then(() => fetchUnreadComunicazioni());
  } else {
      fetchUnreadComunicazioni();
  }
});


function fetchUnreadComunicazioni() {
  fetch('/comunicazioni/get')
      .then(response => response.json())
      .then(data => {
          const unreadCount = data.rows.filter(c => !c.isRead).length;
          const badge = document.getElementById('comunicazioni-badge');
          const menuItem = document.querySelector('a[href="/comunicazioni.html"]');
          const icon = menuItem.querySelector('.glyphicons.message_full i');

          if (unreadCount > 0) {
              // Show the badge and set the count
              badge.style.display = 'inline-block';
              badge.textContent = unreadCount;

              // Add blink classes to both the badge, icon, and menu item background
              badge.classList.add('blink');
              if (icon) {
                  icon.classList.add('blink');
              }
              menuItem.classList.add('blink-bg');
          } else {
              // Hide the badge and remove blink classes
              badge.style.display = 'none';
              badge.classList.remove('blink');
              if (icon) {
                  icon.classList.remove('blink');
              }
              menuItem.classList.remove('blink-bg');
          }
      })
      .catch(error => console.error('Error fetching unread comunicazioni:', error));
}

setInterval(fetchUnreadComunicazioni, 60000);

$("#btnInviteUser").on("click", ()=>{
    let mailTo = $("#userMailInvite").val();
    fetch("/team/invite", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({ mailTo: mailTo }),
    }).then((r) => {
        if (r.status == 401){
            window.location.href = "/";
        }else if(r.status !== 200) {
            return alert("❌ Si è verificato un errore durante la creazione dell'invito.");
        }
    });
});

//Filter textbox
function setValidation(textbox, inputFilter, errMsg) {
    ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop", "focusout"].forEach(function(event) {
      textbox.addEventListener(event, function(e) {
        if (inputFilter(this.value)) {
          // valori accettati
          if (["keydown","mousedown","focusout"].indexOf(e.type) >= 0){
            this.classList.remove("input-error");
            this.setCustomValidity("");
          }
          this.oldValue = this.value;
          this.oldSelectionStart = this.selectionStart;
          this.oldSelectionEnd = this.selectionEnd;
        } else if (this.hasOwnProperty("oldValue")) {
          this.classList.add("input-error");
          this.setCustomValidity(errMsg);
          this.reportValidity();
          this.value = this.oldValue;
          this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
        } else {
          this.value = "";
        }
      });
    });
  }
function ShowAlert(pnlID, customText) {
    $(".pnlAlert").show();
    if (customText) $("#lblCustom").text(customText);
    let pnlSelector = "#" + pnlID;
    if ($(pnlSelector).length == 0){
      pnlSelector = "#lblCustom";
    }
    $(pnlSelector).fadeIn(function () {
      setTimeout(function () {
          HideAlert();
      }, 2000);
    });
}

function HideAlert() {
  $(".pnlAlert").fadeOut(function () {
      $(".pnlAlertItem").hide();
  });
}

function GetBKCredit() {
  fetch("/master/getCreditBK", {
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
    if (r.status == 401 || r.status !== 200) {
      alert("❌ E' stato rilevato un accesso non autorizzato.");
      return window.location.href = "/";
    }

    r.json().then((res) => {
      // Update credit
      $("#lblBKCredit").text(res.bk);
      $("#bakecaCredit").text(formatNumber(res.bakeca));
      $("#megaescortCredit").text(formatNumber(res.megaescort));
      $("#trovagnoccaCredit").text(formatNumber(res.trovagnocca));

      // Flash red if below 500
      if (parseInt(res.bk.replace(".", "")) < 500) {
        setInterval(() => {
          $("#lblBKCredit").toggleClass("label-danger label-success");
        }, 500);
      }

      // Show/hide existing coupon notice element
      if (res.coupon === true) {
        $("#couponNotice").show();
      } else {
        $("#couponNotice").hide();
      }
    });
  });
}

const formatNumber = (value) => {
  const number = parseFloat(value);
  return Number.isNaN(number) ? 0 : number.toString();
};

function getBKUsername(){
  fetch("/profile/get", {
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
    if (r.status == 401){
        window.location.href = "/";
    }else if(r.status !== 200) {
        return alert("❌ Si è verificato un errore durante il caricamento dell'utente.");
    }
    r.json().then(async (res) => {
        $("#lblBKCredit2").text(res.user.userName);
    });
});
}

function SetNavigator(){
  fetch("/master/getNavigator", {
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
        alert("❌ E' stato rilevato un accesso non autorizzato.");
        return window.location.href = "/";
    }else if(r.status !== 200) {
        return alert("❌ E' stato rilevato un accesso non autorizzato.");
    }
    r.json().then(async (res) => {
      $(res.navigator).each((i, x)=>{
        if(!x.state){
          $(`#menu li a[href="${x.path}"]`).parent().remove();
        }
      });
    });
});
}
