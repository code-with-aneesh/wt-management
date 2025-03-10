<script lang="ts">
  import { user } from "$lib/stores/authStore";
  import { logout as firebaseLogout } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import "../app.css";
  import { onDestroy } from "svelte";

  let currentUser: { displayName: string; photoURL: string } | null = null;
  let menuOpen = false;

  const unsubscribe = user.subscribe((u) => {
    if (u) {
      currentUser = {
        displayName: u.displayName || "Anonymous",
        photoURL: u.photoURL || "default-profile.png",
      };
    } else {
      currentUser = null;
    }
  });

  onDestroy(() => {
    unsubscribe();
  });

  function logout() {
    firebaseLogout();
    goto("/");
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }
</script>

<nav class="bg-gray-800 p-4">
  <div class="container mx-auto flex justify-between items-center flex-wrap">
    <div class="text-white text-lg font-bold">
      <a href="/">WtManagement</a>
    </div>
    <button
      class="text-white sm:hidden"
      on:click={toggleMenu}
      aria-label="Toggle menu"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16m-7 6h7"
        ></path>
      </svg>
    </button>
    <div
      class={`space-x-4 flex items-center mt-2 sm:mt-0 ${menuOpen ? "block" : "hidden"} sm:flex`}
    >
      {#if currentUser}
        <a href="/bmi" class="text-gray-300 hover:text-white">bmi</a>
        <a href="/dashboard" class="text-gray-300 hover:text-white">Dashboard</a>
        <a href="/about" class="text-gray-300 hover:text-white">About</a>
        <span class="text-gray-300 hidden sm:inline">{currentUser.displayName}</span>
        <img
          src={currentUser.photoURL}
          alt={currentUser.displayName}
          class="inline-block w-8 h-8 rounded-full ml-2 hidden sm:inline"
        />
        <button
          type="button"
          class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          on:click={logout}
          aria-label="Logout">Logout</button>
      {/if}
    </div>
  </div>
</nav>

<main class="container mx-auto mt-4 px-4">
  <slot></slot>
</main>

<style>
  @media (max-width: 640px) {
    nav .container {
      flex-direction: column;
      align-items: flex-start;
    }
    nav .space-x-4 {
      flex-direction: column;
      align-items: flex-start;
      margin-right: 0;
      margin-bottom: 1rem;
    }
  }
</style>