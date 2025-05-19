// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    type User as FirebaseUser
} from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp // For more accurate timestamps
} from "firebase/firestore";

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
let firebaseApp: FirebaseApp;
if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApps()[0];
}

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Sign in with Google and add user to Firestore if not exists
export const loginWithGoogle = async (): Promise<FirebaseUser | null> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const loggedInUser = result.user;

        if (!loggedInUser) {
            throw new Error("No user returned from Google sign-in.");
        }

        const userRef = doc(db, "users", loggedInUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: loggedInUser.uid,
                name: loggedInUser.displayName || "Anonymous",
                email: loggedInUser.email || "",
                photoURL: loggedInUser.photoURL || "",
                createdAt: serverTimestamp(), // Use Firestore server timestamp
                lastLoginAt: serverTimestamp()
            });
        } else {
            // Optionally update lastLoginAt for existing users
            await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
        }
        // The authStore will automatically pick up the new user state via onAuthStateChanged
        return loggedInUser;
    } catch (error) {
        console.error("Login failed:", error);
        // Depending on how you want to handle errors, you might re-throw or return null
        return null; // Or throw error;
    }
};

// Sign out
export const logout = async (): Promise<void> => {
    try {
        await signOut(auth);
        // The authStore will automatically pick up the null user state via onAuthStateChanged
    } catch (error) {
        console.error("Logout failed:", error);
        // throw error; // Optionally re-throw
    }
};