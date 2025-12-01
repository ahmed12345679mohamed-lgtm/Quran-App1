import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// إعدادات مشروعك الخاصة (تم دمج المفاتيح التي أرسلتها)
const firebaseConfig = {
  apiKey: "AIzaSyBy9-kDy0JnunaSubLm-VhliTGhP2jZs6o",
  authDomain: "dar-altawheed.firebaseapp.com",
  projectId: "dar-altawheed",
  storageBucket: "dar-altawheed.firebasestorage.app",
  messagingSenderId: "1090036818546",
  appId: "1:1090036818546:web:2439dbc444658f5c4698eb",
  measurementId: "G-3DVF71VRBN"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تصدير قاعدة البيانات لاستخدامها في باقي التطبيق
export const db = getFirestore(app);