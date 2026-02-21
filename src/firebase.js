import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// ─── REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES ─────────────────────────
// Firebase Console → Project Settings → Your Apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyCexkTA6XtK1YgGXkDcmZkVVfVjCN2tv2k",
  authDomain: "mb3-intake.firebaseapp.com",
  databaseURL: "mb3-intake.firebaseapp.com",
  projectId: "mb3-intake",
  storageBucket: "mb3-intake.firebasestorage.app",
  messagingSenderId: "461942803642",
  appId: "1:461942803642:web:dcdb52e6341e03f4d34683",
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
