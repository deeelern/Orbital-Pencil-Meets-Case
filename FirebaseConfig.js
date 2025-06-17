import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyZkIF4-0bcy1s4zub0dUHbg2F1ezBEWQ",
  authDomain: "pencil-meets-case.firebaseapp.com",
  projectId: "pencil-meets-case",
  storageBucket: "pencil-meets-case.firebasestorage.app",
  messagingSenderId: "453407555017",
  appId: "1:453407555017:web:56f59a196b45418179fc18",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;
