// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBN-J7BYjeO0i4WoLG8qGsaF7cbpVZSRwg",
  authDomain: "cinescope-64420.firebaseapp.com",
  projectId: "cinescope-64420",
  storageBucket: "cinescope-64420.firebasestorage.app",
  messagingSenderId: "809723711760",
  appId: "1:809723711760:web:142a0dc0b461c6f9365595"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
