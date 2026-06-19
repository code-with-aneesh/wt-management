import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { auth } from '$lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

export const user: Writable<FirebaseUser | null> = writable(null);
export const isLoadingAuth: Writable<boolean> = writable(true);
export const isAuthenticated: Writable<boolean> = writable(false);

let unsubscribe: (() => void) | null = null;

function listenForAuthChanges() {
    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = auth.onAuthStateChanged(
        (currentUser: FirebaseUser | null) => {
            user.set(currentUser);
            isAuthenticated.set(!!currentUser);
            isLoadingAuth.set(false);
        },
        (error) => {
            console.error("Authentication error:", error);
            user.set(null);
            isAuthenticated.set(false);
            isLoadingAuth.set(false);
        }
    );
}

if (browser) {
    listenForAuthChanges();
}