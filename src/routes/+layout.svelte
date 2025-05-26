<script lang="ts">
  import { user } from "$lib/stores/authStore";
  import { logout as firebaseLogout } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import { DarkMode } from "flowbite-svelte";
  import "../app.css";
  import { onDestroy } from "svelte";
  import { fade, slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";

  let currentUser: { displayName: string; photoURL: string } | null = null;
  let menuOpen = false;

  const unsubscribe = user.subscribe((u) => {
    currentUser = u
      ? {
          displayName: u.displayName || "Anonymous",
          photoURL: u.photoURL || "/default-profile.png",
        }
      : null;
  });

  onDestroy(() => unsubscribe());

  function logout() {
    firebaseLogout();
    goto("/");
    menuOpen = false;
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }
</script>

<svelte:head>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div
  class="dark:bg-gray-900 min-h-screen font-inter transition-colors duration-200"
>
  <!-- Navbar -->
  <div class="sticky top-0 z-50">
    <nav
      class="dark:bg-gray-950 bg-gray-950 border-b dark:border-gray-700 px-4 py-3 shadow-md"
    >
      <div class="container mx-auto flex justify-between items-center">
        <a
          href="/"
          class="text-xl font-bold text-gray-100 dark:text-white tracking-tight hover:text-gray-300 dark:hover:text-gray-200 transition-colors"
        >
          WtManagement
        </a>

        {#if currentUser}
          <div class="flex items-center gap-4">
            <!-- Desktop Navigation -->
            <div class="hidden sm:flex items-center space-x-6">
              <a
                href="/dashboard"
                class="text-gray-100 dark:text-gray-300 hover:text-gray-300 dark:hover:text-white font-medium text-sm transition-colors duration-200"
              >
                Dashboard
              </a>
              <a
                href="/gym"
                class="text-gray-100 dark:text-gray-300 hover:text-gray-300 dark:hover:text-white font-medium text-sm transition-colors duration-200"
              >
                Gym Tracker
              </a>
              <a
                href="/blog"
                class="text-gray-100 dark:text-gray-300 hover:text-gray-300 dark:hover:text-white font-medium text-sm transition-colors duration-200"
              >
                Blog
              </a>
              <a
                href="/bmi"
                class="text-gray-100 dark:text-gray-300 hover:text-gray-300 dark:hover:text-white font-medium text-sm transition-colors duration-200"
              >
                BMI Analyzer
              </a>
              <a
                href="/input"
                class="text-gray-100 dark:text-gray-300 hover:text-gray-300 dark:hover:text-white font-medium text-sm transition-colors duration-200"
              >
                Data Input
              </a>
            </div>

            <!-- User Controls -->
            <div class="flex items-center gap-4">
              <!-- Single Dark Mode Toggle -->
              <DarkMode
                class="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-lg p-2"
              />

              <!-- User Profile -->
              <div class="hidden sm:flex items-center gap-3">
                <span class="text-gray-300 dark:text-gray-400 text-sm">
                  {currentUser.displayName}
                </span>
                <a href="/profile" class="group relative">
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    class="w-9 h-9 rounded-full border-2 border-gray-700 dark:border-gray-600 transition-transform duration-200 group-hover:scale-105"
                  />
                </a>
              </div>

              <!-- Logout Button -->
              <button
                on:click={logout}
                class="hidden sm:flex text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 transition-colors duration-200"
              >
                Logout
              </button>

              <!-- Mobile Menu Toggle -->
              <button
                class="sm:hidden text-gray-100 dark:text-gray-300 focus:outline-none transition-transform hover:scale-110"
                on:click={toggleMenu}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                {#if menuOpen}
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                {:else}
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                {/if}
              </button>
            </div>
          </div>
        {:else}
          <!-- Show Dark Mode toggle only when logged out -->
          <DarkMode
            class="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-lg p-2"
          />
        {/if}
      </div>
    </nav>

    <!-- Mobile Menu -->
    {#if currentUser && menuOpen}
      <div
        transition:fade={{ duration: 150 }}
        class="sm:hidden dark:bg-gray-950 bg-gray-950 w-full shadow-lg"
      >
        <div
          transition:slide={{ duration: 600, easing: cubicOut }}
          class="container mx-auto px-4 py-4"
        >
          <div class="flex flex-col space-y-4">
            <a
              href="/dashboard"
              class="text-gray-100 dark:text-gray-300 hover:text-gray-400 dark:hover:text-white py-2 transition-colors"
              on:click={toggleMenu}
            >
              Dashboard
            </a>
            <a
              href="/blog"
              class="text-gray-100 dark:text-gray-300 hover:text-gray-400 dark:hover:text-white py-2 transition-colors"
              on:click={toggleMenu}
            >
              Blog
            </a>
            <a
              href="/gym"
              class="text-gray-100 dark:text-gray-300 hover:text-gray-400 dark:hover:text-white py-2 transition-colors"
              on:click={toggleMenu}
            >
              Gym Tracker
            </a>
            <a
              href="/bmi"
              class="text-gray-100 dark:text-gray-300 hover:text-gray-400 dark:hover:text-white py-2 transition-colors"
              on:click={toggleMenu}
            >
              BMI Analyzer
            </a>
            <a
              href="/input"
              class="text-gray-100 dark:text-gray-300 hover:text-gray-400 dark:hover:text-white py-2 transition-colors"
              on:click={toggleMenu}
            >
              Data Input
            </a>

            <div
              class="pt-4 border-t dark:border-gray-700 flex items-center justify-between"
            >
              <div class="flex items-center space-x-3">
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  class="w-9 h-9 rounded-full border-2 border-gray-700 dark:border-gray-600"
                />
                <div>
                  <p class="text-gray-300 dark:text-gray-400 font-medium">
                    {currentUser.displayName}
                  </p>
                  <button
                    on:click={logout}
                    class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Main Content -->
  <main
    class="container mx-auto px-4 py-8 dark:bg-gray-900 dark:text-gray-300 min-h-[calc(100vh-4rem)]"
  >
    <slot />
  </main>
</div>
