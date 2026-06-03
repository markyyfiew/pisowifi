const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

function login(){

    const username =
    document.getElementById("username").value.trim();

    const password =
    document.getElementById("password").value;

    const errorMsg =
    document.getElementById("errorMsg");

    if(
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ){

        localStorage.setItem(
            "isLoggedIn",
            "true"
        );

        localStorage.setItem(
            "adminName",
            username
        );

        window.location.href = "index.html";
    }
    else{

        errorMsg.innerHTML =
        "❌ Invalid username or password";

    }
}

document.addEventListener(
    "keypress",
    function(event){

        if(event.key === "Enter"){
            login();
        }

    }
);