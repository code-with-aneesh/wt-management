import { initializeApp, getApps } from "firebase/app";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut 
} from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc 
} from "firebase/firestore";
import { user } from "$lib/stores/authStore";

// Firebase Config from .env
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

// Initialize Firebase
let firebaseApp;
if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApps()[0];
}

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Sign in with Google and add user to Firestore if not exists
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const loggedInUser = result.user;

        if (!loggedInUser) return;

        // Reference to Firestore user document
        const userRef = doc(db, "users", loggedInUser.uid);
        const userSnap = await getDoc(userRef);

        // If user does not exist, create a new document
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: loggedInUser.uid,
                name: loggedInUser.displayName || "Anonymous",
                email: loggedInUser.email || "",
                photoURL: loggedInUser.photoURL || "",
                createdAt: new Date().toISOString(),
            });
        }

        // Update the Svelte store with user data
        user.set(loggedInUser);

        return loggedInUser;
    } catch (error) {
        console.error("Login failed:", error);
    }
};

// Sign out
export const logout = async () => {
    await signOut(auth);
    user.set(null);
};
