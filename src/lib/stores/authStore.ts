// src/lib/stores/authStore.ts
import { writable, type Writable } from 'svelte/store';
import { auth } from '$lib/firebase'; // This import is now safe
import type { User as FirebaseUser } from 'firebase/auth'; // Using 'FirebaseUser' to avoid naming conflicts

export const user: Writable<FirebaseUser | null> = writable(null);
export const isLoadingAuth: Writable<boolean> = writable(true); // True until first auth state check completes
export const isAuthenticated: Writable<boolean> = writable(false);

let unsubscribe: (() => void) | null = null;

// Function to initialize and listen for auth changes
function listenForAuthChanges() {
    // Ensure we only subscribe once, or clean up previous subscription
    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = auth.onAuthStateChanged(
        (currentUser: FirebaseUser | null) => {
            user.set(currentUser);
            isAuthenticated.set(!!currentUser);
            isLoadingAuth.set(false); // Auth state is now known
        },
        (error) => {
            console.error("Authentication error:", error);
            user.set(null);
            isAuthenticated.set(false);
            isLoadingAuth.set(false); // Auth state check failed but completed
        }
    );
}

// Start listening as soon as the store module is loaded
listenForAuthChanges();

// Optional: You might want a cleanup function if your app has complex lifecycle needs,
// but usually onAuthStateChanged handles its own lifecycle well.
// export const cleanupAuthListener = () => {
//   if (unsubscribe) {
//     unsubscribe();
//   }
// };