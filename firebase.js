  // Firebase Config (PALITAN MO ITO SA FIREBASE PROJECT MO)
  const firebaseConfig = {
  apiKey: "AIzaSyApPVkhz1Dnh3zmFx-f5jmwkN3PqQAZhOk",
  authDomain: "pisowifitimer.firebaseapp.com",
  databaseURL: "https://pisowifitimer-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pisowifitimer",
  storageBucket: "pisowifitimer.firebasestorage.app",
  messagingSenderId: "997082037518",
  appId: "1:997082037518:web:77bf4d2115db1c8334ab5f",
  measurementId: "G-XGJF2GJDSV"
};

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  // Realtime Database
  const db = firebase.database();