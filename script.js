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

        alert(
            "Session Created!\n\n" +
            "Customer: " + name +
            "\n\nClient Link:\n" +
            link
        );

    });
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
            <td>
                <button onclick="pauseSession('${s.id}')">Pause</button>
                <button onclick="resumeSession('${s.id}')">Resume</button>
                <button onclick="extendTime('${s.id}',30)">+30m</button>
                <button onclick="extendTime('${s.id}',120)">+2h</button>
                <button onclick="extendTime('${s.id}',300)">+5h</button>
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
