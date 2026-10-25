<script lang="ts">
  import { page } from "$app/stores";
  import ProfileView from "$lib/components/ProfileView.svelte";

  $: uid = $page.params.uid;
</script>

<ProfileView {uid} />
