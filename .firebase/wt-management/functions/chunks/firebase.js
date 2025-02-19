import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyC7A9QS5Md2sWRUeElcQuPtNbxsi-Y1xhA",
  authDomain: "wt-management.firebaseapp.com",
  projectId: "wt-management",
  storageBucket: "wt-management.firebasestorage.app",
  messagingSenderId: "972764389119",
  appId: "1:972764389119:web:9defd4f7bc2913287276ca"
};
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
const auth = getAuth(firebaseApp);
new GoogleAuthProvider();
const db = getFirestore(firebaseApp);
export {
  auth as a,
  db as d
};
