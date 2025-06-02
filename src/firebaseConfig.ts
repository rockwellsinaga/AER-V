// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Opsional, bisa dihapus jika tidak dipakai
import { getDatabase } from "firebase/database"; // PENTING: Impor untuk Realtime Database

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAl-8HNKh04Z7ehaqU-NWfMFZn8gn2FxUY",
  authDomain: "vocproject-4f5e4.firebaseapp.com",
  databaseURL: "https://vocproject-4f5e4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vocproject-4f5e4",
  storageBucket: "vocproject-4f5e4.firebasestorage.app",
  messagingSenderId: "157193888320",
  appId: "1:157193888320:web:f0feaae3ed183555d975a5",
  measurementId: "G-RGBV4PFCFJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Opsional, bisa dihapus jika tidak dipakai di dashboard
const database = getDatabase(app); // Inisialisasi dan dapatkan instance database

export { database, app }; // Ekspor database agar bisa diimpor di komponen lain, 'app' juga bisa diekspor jika perlu