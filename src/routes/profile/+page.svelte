<script lang="ts">
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { isLoadingAuth, user } from "$lib/stores/authStore";

  $: if (browser && !$isLoadingAuth) {
    goto($user ? `/profile/${$user.uid}` : "/", { replaceState: true });
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div
    class="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"
  ></div>
</div>
