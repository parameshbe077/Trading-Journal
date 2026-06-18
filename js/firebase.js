import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAnalytics, isSupported as analyticsSupported } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBlOpIsD3c-w3s-wD5MCOM3xEEssXeHNNs',
  authDomain: 'journal-98842.firebaseapp.com',
  projectId: 'journal-98842',
  storageBucket: 'journal-98842.firebasestorage.app',
  messagingSenderId: '924202206111',
  appId: '1:924202206111:web:76d2c3b4b94eb0e33bf3aa',
  measurementId: 'G-C7GHFPDBP4',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export let analytics = null;
analyticsSupported().then(supported => {
  if (supported) analytics = getAnalytics(app);
}).catch(() => {});
