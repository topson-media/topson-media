// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAh6MUfrBdCQj4DPJpmrh-8uquZ_RQblk0",
  authDomain: "topson-media.firebaseapp.com",
  projectId: "topson-media",
  storageBucket: "topson-media.firebasestorage.app",
  messagingSenderId: "913929800746",
  appId: "1:913929800746:web:e86642e844de1c771e0753",
  measurementId: "G-78320MJ5C2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
