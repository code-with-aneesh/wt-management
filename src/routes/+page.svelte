<script lang="ts">
    import type { User } from "firebase/auth";
    import { user } from "$lib/stores/authStore";
    import { loginWithGoogle, logout } from "$lib/firebase";
    import { onDestroy } from "svelte";
    import { goto } from "$app/navigation";

    let currentUser: User | null;
    const unsubscribe = user.subscribe((u) => {
        currentUser = u;
        if (currentUser) {
            goto("/dashboard");
        }
    });
    onDestroy(unsubscribe);
</script>

<main class="container">
    <h1>SvelteKit Firebase Auth</h1>

    {#if !currentUser}
        <button
            type="button"
            on:click={loginWithGoogle}
            aria-label="Login with Google"
            class="text-white bg-[#4285F4] hover:bg-[#4285F4]/90 focus:ring-4 focus:outline-none focus:ring-[#4285F4]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#4285F4]/55 me-2 mb-2"
        >
            <svg
                class="w-4 h-4 me-2"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 18 19"
            >
                <path
                    fill-rule="evenodd"
                    d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z"
                    clip-rule="evenodd"
                />
            </svg>
            Sign in with Google
        </button>
    {/if}
</main>

<style>
    .container {
        text-align: center;
        margin: 50px auto;
    }
    button {
        padding: 10px 20px;
        background: #4285f4;
        color: white;
        border: none;
        cursor: pointer;
        border-radius: 5px;
        font-size: 16px;
    }
    button:hover {
        background: #357ae8;
    }
</style>
