import { writable } from 'svelte/store';
import { auth } from '$lib/firebase';
import type { User } from 'firebase/auth';

// Store for user state
export const user = writable<User | null>(null);

// Listen for auth changes
auth.onAuthStateChanged((currentUser) => {
    user.set(currentUser);
});
