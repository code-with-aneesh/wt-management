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
    menuOpen = false;
  } 

  function toggleMenu() {
    menuOpen = !menuOpen;
  }
</script>

<!-- Add Google Fonts link in your layout or index.html -->
<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>
 
<div class="dark:bg-gray-950 min-h-screen font-inter">
  <!-- Made navbar sticky with top-0, z-50 to ensure it's above other content -->
  <nav class="sticky top-0 z-50 dark:bg-gray-950 dark:border-gray-800 bg-gray-900 border-gray-800 px-4 py-3 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
      <a href="/" class="text-xl font-bold text-gray-100 dark:text-white tracking-tight">
        WtManagement
      </a>
      
      {#if currentUser}
        <div class="flex items-center">
          <div class="hidden sm:flex items-center space-x-4 mr-4">
            <a 
              href="/bmi" 
              class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium text-sm"
            >
              BMI
            </a>
            <a 
              href="/input" 
              class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium text-sm"
            >
              Input
            </a>
            <a 
              href="/dashboard" 
              class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium text-sm"
            >
              Dashboard
            </a>
            <a 
              href="/about" 
              class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium text-sm"
            >
              About
            </a>
          </div>
          
          <div class="hidden sm:flex items-center space-x-2">
            <span class="text-gray-300 dark:text-gray-400 text-sm">
              {currentUser.displayName}
            </span>
            <a href="/profile"><img 
              src={currentUser.photoURL} 
              alt={currentUser.displayName} 
              class="w-8 h-8 rounded-full border-2 border-gray-700 dark:border-gray-600" 
            /></a>
            <button 
              type="button" 
              class="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:ring-blue-950 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-900 dark:hover:bg-blue-950 focus:outline-none" 
              on:click={logout}
            >
              Logout
            </button>
          </div>

          <button 
            class="sm:hidden text-gray-100 dark:text-white focus:outline-none"
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
        </div>
      {/if}
    </div>
  </nav>

  {#if currentUser && menuOpen}
    <div class="sm:hidden dark:bg-gray-950 bg-gray-900 absolute w-full z-50">
      <div class="container mx-auto px-4 py-4">
        <div class="flex flex-col space-y-4">
          <a 
            href="/bmi" 
            class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium"
            on:click={toggleMenu}
          >
            BMI
          </a>
          <a 
            href="/input" 
            class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium"
            on:click={toggleMenu}
          >
            Input
          </a>
          <a 
            href="/dashboard" 
            class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium"
            on:click={toggleMenu}
          >
            Dashboard
          </a>
          <a 
            href="/about" 
            class="text-gray-100 dark:text-gray-200 hover:text-gray-300 dark:hover:text-white font-medium"
            on:click={toggleMenu}
          >
            About
          </a>
          
          <div class="flex items-center space-x-2 mt-4">
            <span class="text-gray-300 dark:text-gray-400 text-sm">
              {currentUser.displayName}
            </span>
            <a href="/profile"><img 
              src={currentUser.photoURL} 
              alt={currentUser.displayName} 
              class="w-8 h-8 rounded-full border-2 border-gray-700 dark:border-gray-600" 
            /></a>
            <button 
              type="button" 
              class="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:ring-blue-950 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-900 dark:hover:bg-blue-950 focus:outline-none" 
              on:click={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
 
  <main class="container mx-auto mt-4 px-4 dark:bg-gray-950 dark:text-gray-200">
    <slot></slot>
  </main>
</div>