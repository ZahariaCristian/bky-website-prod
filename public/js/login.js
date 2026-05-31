// if (localStorage.getItem("key"))
//     document.querySelector(".login-wrapper").classList.add("disabled");
// else
//     document.querySelector(".logout-wrapper").classList.add("disabled");

const logout = () => {
    fetch("/logout", {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
    })
    window.location.href = "/index.html";
};

const login = () => {
    toggleLoader();
    fetch("/login", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify({username: document.querySelector("#txtUsername").value, password: document.querySelector("#txtPassword").value }),
    }).then((r) => {
        toggleLoader();
        if (r.status !== 200) {
            document.querySelector("#txtPassword").value = "";
            $(".valid-pass > .alert-danger").text("Password o nome utente incorretti");
            $(".valid-pass").show();
            return "KO";
        };
        r.json().then(async (res) => {
            if(res.err) {
                $(".valid-pass > .alert-danger").text(res.err);
                $(".valid-pass").show();
            }else{
                if(res.firstTime){
                    window.location.href = "/profile.html";
                }else{
                    window.location.href = "/listaAnnunci.html";
                }
            }
        });
    });
};

document.addEventListener("keypress", logKey => {
    if (logKey.key === "Enter")
        login();
})