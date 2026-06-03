"use strict";

/* =========================
   LOGIN PROTECTION
========================= */
if (localStorage.getItem("isLoggedIn") !== "true") {
    window.location.href = "login.html";
}

/* =========================
   FIREBASE REFS
========================= */
const sessionsRef = db.ref("sessions");
const finishedRef = db.ref("finished");
const revenueRef = db.ref("revenue");

/* =========================
   STATE
========================= */
let sessions = {};
let finished = [];
let revenue = 0;

/* =========================
   FLAGS
========================= */
let isRendering = false;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const adminDisplay = document.getElementById("adminDisplay");
    if (adminDisplay) {
        adminDisplay.innerText = localStorage.getItem("adminName") || "Admin";
    }

    showPage("dashboardPage");
});

/* =========================
   MENU
========================= */
function toggleMenu() {
    document.getElementById("sidebar").classList.toggle("active");
}

/* =========================
   LOGOUT
========================= */
function logout() {
    if (confirm("Logout?")) {
        localStorage.removeItem("isLoggedIn");
        window.location.href = "login.html";
    }
}

/* =========================
   FIREBASE SYNC
========================= */
sessionsRef.on("value", snap => {
    sessions = snap.val() || {};
    render();
});

finishedRef.on("value", snap => {
    finished = Object.values(snap.val() || {});
    render();
});

revenueRef.on("value", snap => {
    revenue = snap.val() || 0;
    render();
});

/* =========================
   ADD SESSION
========================= */
function addSession(label, amount, minutes){

    const name = document.getElementById("name").value.trim();

    if(!name){
        alert("Enter customer name");
        return;
    }

    const newRef = sessionsRef.push();

    newRef.set({
        id: newRef.key,
        name,
        label,
        amount,
        end: Date.now() + (minutes * 60000),
        paused: false,
        remaining: 0
    }).then(() => {

        revenueRef.transaction(curr => (curr || 0) + amount);

        document.getElementById("name").value = "";

        // ✅ FIXED LINK
        const link =
    "https://markyyfiew.github.io/pisowifi/client.html?id=" +
    newRef.key;

showQR(link);

    });
}
function showQR(link){

    const modal =
        document.getElementById("qrContainer");

    modal.style.display = "flex";

    document.getElementById("sessionLink").value = link;

    const qrDiv =
        document.getElementById("qrcode");

    qrDiv.innerHTML = "";

    new QRCode(qrDiv,{
        text: link,
        width: 250,
        height: 250
    });
}

function copyLink(){

    const input =
        document.getElementById("sessionLink");

    input.select();

    document.execCommand("copy");

    alert("Link copied!");
}

function closeQR(){
    document.getElementById("qrContainer").style.display = "none";
}

/* =========================
   FORMAT TIME
========================= */
function formatTime(ms) {
    if (ms < 0) ms = 0;

    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);

    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* =========================
   PAUSE / RESUME
========================= */
function pauseSession(id) {
    sessionsRef.child(id).once("value", snap => {
        const s = snap.val();
        if (!s) return;

        sessionsRef.child(id).update({
            paused: true,
            remaining: s.end - Date.now()
        });
    });
}

function resumeSession(id) {
    sessionsRef.child(id).once("value", snap => {
        const s = snap.val();
        if (!s) return;

        sessionsRef.child(id).update({
            paused: false,
            end: Date.now() + (s.remaining || 0)
        });
    });
}

/* =========================
   EXTEND TIME
========================= */
function extendTime(id, minutes) {
    sessionsRef.child(id).once("value", snap => {
        const s = snap.val();
        if (!s) return;

        if (s.paused) {
            sessionsRef.child(id).update({
                remaining: (s.remaining || 0) + minutes * 60000
            });
        } else {
            sessionsRef.child(id).update({
                end: s.end + minutes * 60000
            });
        }
    });
}

/* =========================
   END SESSION
========================= */
function endSession(id) {
    sessionsRef.child(id).once("value", snap => {
        const s = snap.val();
        if (!s) return;

        finishedRef.push({
    name: s.name,
    label: s.label,
    reason: "Ended by Admin",
    finishedAt: new Date().toLocaleString()
});

        sessionsRef.child(id).remove();
    });
}

/* =========================
   AUTO EXPIRE (FIXED)
========================= */
setInterval(() => {

    const now = Date.now();

    Object.entries(sessions || {}).forEach(([key, s]) => {

        if (!s) return;

        if (!s.paused && s.end <= now) {

    finishedRef.push({
        name: s.name,
        label: s.label,
        reason: "Expired",
        finishedAt: new Date().toLocaleString()
    });

    sessionsRef.child(key).remove();
}
    });

}, 5000);

/* =========================
   RENDER
========================= */
function render() {

    if (isRendering) return;
    isRendering = true;

    const activeBody = document.getElementById("activeBody");
    const finishedBody = document.getElementById("finishedBody");

    if (!activeBody || !finishedBody) {
        isRendering = false;
        return;
    }

    const search = document.getElementById("searchUser")?.value.toLowerCase() || "";

    activeBody.innerHTML = "";

    const now = Date.now();

    Object.values(sessions || {}).forEach(s => {

        if (!s || !s.name) return;

        const remaining = s.paused ? s.remaining : (s.end - now);

        if (search && !s.name.toLowerCase().includes(search)) return;

        activeBody.innerHTML += `
        <tr>
            <td>${s.name}</td>
            <td>${s.label}</td>
            <td>${formatTime(remaining)}</td>
            <td>${s.paused ? "Paused" : "Active"}</td>
        <<td>
    <button onclick="pauseSession('${s.id}')">Pause</button>
    <button onclick="resumeSession('${s.id}')">Resume</button>
    <button onclick="extendCustom('${s.id}')">Extend</button>
    <button onclick="endSession('${s.id}')">End</button>
        </td>
        </tr>`;
    });

    finishedBody.innerHTML = "";

    finished.forEach(f => {
        finishedBody.innerHTML += `
        <tr>
            <td>${f.name}</td>
            <td>${f.label}</td>
            <td>${f.finishedAt}</td>
        </tr>`;
    });

    document.getElementById("activeCount").innerText = Object.keys(sessions || {}).length;
    document.getElementById("finishedCount").innerText = finished.length;
    document.getElementById("revenue").innerText = revenue;

    isRendering = false;
}

/* =========================
   LOOP
========================= */
setInterval(render, 1000);

/* =========================
   PAGE NAV
========================= */
function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active-page");
    });

    document.getElementById(pageId)?.classList.add("active-page");

    document.getElementById("sidebar")?.classList.remove("active");
}
function clearAllData() {
    if (!confirm("Clear ALL data? This will delete sessions, history, and revenue.")) {
        return;
    }

    // delete sessions
    sessionsRef.remove();

    // delete finished history
    finishedRef.remove();

    // reset revenue
    revenueRef.set(0);

    // reset local UI state
    sessions = {};
    finished = [];
    revenue = 0;

    render();

    alert("All data cleared!");
}
//Change password
function changePassword() {
    const newPass = prompt("Enter new password:");

    if (!newPass) return;

    localStorage.setItem("adminPassword", newPass);

    alert("Password updated!");
}
//TOGGLE DARK MODE
function toggleDarkMode() {
    document.body.classList.toggle("light-mode");

    if (document.body.classList.contains("light-mode")) {
        localStorage.setItem("theme", "light");
    } else {
        localStorage.setItem("theme", "dark");
    }
}
function addCustomSession() {
    const name = document.getElementById("name").value.trim();
    const amount = parseInt(document.getElementById("customAmount").value);
    const hours = parseFloat(document.getElementById("customHours").value);

    if (!name) {
        alert("Enter customer name");
        return;
    }

    if (!amount || !hours) {
        alert("Enter valid amount and hours");
        return;
    }

    const minutes = hours * 60;

    const newRef = sessionsRef.push();

    newRef.set({
        id: newRef.key,
        name,
        label: "₱" + amount + " (Custom)",
        amount,
        end: Date.now() + (minutes * 60000),
        paused: false,
        remaining: 0
    }).then(() => {

        revenueRef.transaction(curr => (curr || 0) + amount);

        document.getElementById("name").value = "";
        document.getElementById("customAmount").value = "";
        document.getElementById("customHours").value = "";

        const link =
            "https://markyyfiew.github.io/pisowifi/client.html?id=" +
            newRef.key;

        showQR(link);
    });
}

function clearHistory(){

    if(!confirm(
        "Delete all finished session history?\n\nThis action cannot be undone."
    )){
        return;
    }

    finishedRef.remove();

    alert("Finished history cleared.");
}

function extendCustom(id){

    let mins = prompt(
        "Enter minutes to add:",
        "30"
    );

    if(mins === null) return;

    mins = parseInt(mins);

    if(isNaN(mins) || mins <= 0){
        alert("Invalid minutes");
        return;
    }

    sessionsRef.child(id).once("value", snap => {

        const s = snap.val();

        if(!s) return;

        if(s.paused){

            sessionsRef.child(id).update({
                remaining: (s.remaining || 0) + (mins * 60000)
            });

        }else{

            sessionsRef.child(id).update({
                end: s.end + (mins * 60000)
            });

        }

    });

}
function extendCustom(id){

    let hours = prompt("Hours to add:", "1");

    if(hours === null) return;

    hours = parseFloat(hours);

    if(isNaN(hours) || hours <= 0){
        alert("Invalid hours");
        return;
    }

    const addMs = hours * 3600000;

    sessionsRef.child(id).once("value", snap => {

        const s = snap.val();

        if(!s) return;

        if(s.paused){

            sessionsRef.child(id).update({
                remaining: (s.remaining || 0) + addMs
            });

        }else{

            sessionsRef.child(id).update({
                end: s.end + addMs
            });

        }

    });

}
