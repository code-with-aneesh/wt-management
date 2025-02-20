<script lang="ts">
  import { user } from "$lib/stores/authStore";
  import { logout as firebaseLogout } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import "../app.css";
  import { onDestroy } from "svelte";

  let currentUser: { displayName: string; photoURL: string } | null = null;

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
</script>

<nav class="bg-gray-800 p-4">
  <div class="container mx-auto flex justify-between items-center">
    <div class="text-white text-lg font-bold">
      <a href="/">WtManagement</a>
    </div>
    {#if currentUser}
      <div class="space-x-4 flex items-center">
        <a href="/" class="text-gray-300 hover:text-white">Home</a>
        <a href="/dashboard" class="text-gray-300 hover:text-white">Dashboard</a
        >
        <a href="/about" class="text-gray-300 hover:text-white">About</a>
        <span class="text-gray-300">{currentUser.displayName}</span>
        <img
          src={currentUser.photoURL}
          alt={currentUser.displayName}
          class="inline-block w-8 h-8 rounded-full ml-2"
        />

        <button
          type="button"
          class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
          on:click={logout}
          aria-label="Logout">Logout</button
        >
      </div>
    {/if}
  </div>
</nav>

<main class="container mx-auto mt-4">
  <slot></slot>
</main>
