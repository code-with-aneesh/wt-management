<script lang="ts">
  import { onMount } from "svelte";
  import { DarkMode, Select } from "flowbite-svelte";
  import { db, auth } from "$lib/firebase";
  import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    doc,
  } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { Button, Card, Alert, Table, TableBody, TableHead, TableHeadCell, TableBodyCell } from "flowbite-svelte";
  import { CheckCircleOutline, ExclamationCircleOutline, TrashBinOutline, CloseCircleOutline } from "flowbite-svelte-icons";

  // Data state
  let weights: { id: string; weight: number; timestamp: Date }[] = [];
  let currentUser: { uid: string } | null = null;

  // Pagination state
  let currentPage = 1;
  const itemsPerPage = 5;

  // Sorting state
  let sortBy = "timestamp";
  let sortOrder = "asc";
  const sortOptions = [
    { value: "timestamp-asc", name: "Date (Oldest First)" },
    { value: "timestamp-desc", name: "Date (Newest First)" },
    { value: "weight-asc", name: "Weight (Low to High)" },
    { value: "weight-desc", name: "Weight (High to Low)" },
  ];

  // Loading and alert states
  let weightLoading = false;
  let weightAlert = { show: false, message: "", type: "success" as "success" | "error" };

  // Initialize component
  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        fetchWeights();
      } else {
        currentUser = null;
        goto("/");
      }
    });

    return () => unsubscribe();
  });

  // Fetch weights with sorting
  async function fetchWeights() {
    if (!currentUser) return;
    weightLoading = true;
    try {
      console.log("Fetching weights for user:", currentUser.uid, "Sort:", sortBy, sortOrder);
      const [field, order] = sortBy.split("-");
      const q = query(
        collection(db, "weights"),
        where("userId", "==", currentUser.uid),
        orderBy(field, order as "asc" | "desc")
      );
      const snapshot = await getDocs(q);
      weights = snapshot.empty
        ? []
        : snapshot.docs.map((doc) => ({
            id: doc.id,
            weight: doc.data().weight,
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }));
    } catch (error: any) {
      console.error("Error fetching weights:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      // Only show error if no data was retrieved
      if (weights.length === 0) {
        showMessage("Failed to load weights. Please try again.", "error");
      }
    } finally {
      weightLoading = false;
    }
  }

  // Handle sort change
  function handleSortChange(event: any) {
    const [field, order] = event.target.value.split("-");
    sortBy = field;
    sortOrder = order;
    currentPage = 1; // Reset to first page on sort change
    fetchWeights();
  }

  // Show alert message
  function showMessage(message: string, type: "success" | "error") {
    weightAlert = { show: true, message, type };
    setTimeout(() => (weightAlert.show = false), 5000);
  }

  // Delete weight
  async function deleteWeight(id: string) {
    if (!currentUser) return;
    weightLoading = true;
    try {
      await deleteDoc(doc(db, "weights", id));
      weights = weights.filter((w) => w.id !== id);
      showMessage("Weight deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting weight: ", error);
      showMessage("Failed to delete weight. Please try again.", "error");
    } finally {
      weightLoading = false;
    }
  }

  // Pagination logic
  $: totalPages = Math.ceil(weights.length / itemsPerPage);
  $: paginatedWeights = weights.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }
</script>

<div
  class="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center pt-6 px-3 sm:pt-10 sm:px-4"
>
  <Card
    class="w-full max-w-full sm:max-w-3xl shadow-lg rounded-xl dark:bg-gray-800 dark:border-gray-700 p-3 sm:p-6"
  >
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-4">
      <h2 class="text-lg sm:text-2xl font-semibold text-gray-800 dark:text-white">
        Manage Weight Records
      </h2>
      <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
        <Select
          class="w-full sm:w-48 text-xs sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          items={sortOptions}
          value={`${sortBy}-${sortOrder}`}
          on:change={handleSortChange}
          disabled={weightLoading}
          aria-label="Sort weight records"
        />
      </div>
    </div>

    {#if weightLoading}
      <p class="text-gray-500 dark:text-gray-400 text-center text-xs sm:text-base">Loading weights...</p>
    {:else if weights.length === 0 && !weightAlert.show}
      <p class="text-gray-500 dark:text-gray-400 text-center text-xs sm:text-base">No weight records found.</p>
    {:else}
      <div class="overflow-x-auto">
        <Table
          shadow
          striped
          class="rounded-lg w-full"
          style="table-layout: fixed;"
          role="region"
          aria-label="Weight records table"
        >
          <TableHead>
            <TableHeadCell class="text-left text-xs sm:text-base text-gray-700 dark:text-gray-200 py-1 sm:py-3 w-1/3 truncate">Weight (kg)</TableHeadCell>
            <TableHeadCell class="text-left text-xs sm:text-base text-gray-700 dark:text-gray-200 py-1 sm:py-3 w-1/3 truncate">Date</TableHeadCell>
            <TableHeadCell class="text-left text-xs sm:text-base text-gray-700 dark:text-gray-200 py-1 sm:py-3 w-1/3 truncate">Action</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each paginatedWeights as { id, weight, timestamp }}
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors animate-fade-in">
                <TableBodyCell class="text-gray-800 dark:text-gray-200 text-xs sm:text-base py-1 sm:py-2 truncate">{weight.toFixed(1)}</TableBodyCell>
                <TableBodyCell class="text-gray-800 dark:text-gray-200 text-xs sm:text-base py-1 sm:py-2 truncate">{timestamp.toLocaleDateString()}</TableBodyCell>
                <TableBodyCell class="py-1 sm:py-2 min-w-[80px] max-w-[100px]">
                  <Button
                    color="red"
                    size="xs"
                    class="flex items-center gap-1 sm:gap-2 hover:bg-red-600 transition-colors text-xs w-full justify-center"
                    on:click={() => deleteWeight(id)}
                    disabled={weightLoading}
                    aria-label={`Delete weight record of ${weight} kg from ${timestamp.toLocaleDateString()}`}
                  >
                    <TrashBinOutline class="w-3 h-3 sm:w-4 sm:h-4" />
                    <span class="hidden sm:inline">Delete</span>
                  </Button>
                </TableBodyCell>
              </tr>
            {/each}
          </TableBody>
        </Table>
      </div>

      <!-- Pagination Controls -->
      {#if totalPages > 1}
        <div class="flex flex-col sm:flex-row justify-between items-center mt-3 sm:mt-4 gap-3 sm:gap-4">
          <Button
            color="light"
            size="xs"
            disabled={currentPage === 1 || weightLoading}
            on:click={() => goToPage(currentPage - 1)}
            class="w-full sm:w-20 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
            aria-label="Previous page"
          >
            Previous
          </Button>
          <div class="flex gap-1 flex-wrap justify-center">
            {#each Array(totalPages) as _, i}
              <Button
                color={currentPage === i + 1 ? "blue" : "light"}
                size="xs"
                on:click={() => goToPage(i + 1)}
                disabled={weightLoading}
                class="w-7 h-7 sm:w-9 sm:h-9 rounded-full {currentPage === i + 1 ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'} text-xs"
                aria-label={`Go to page ${i + 1}`}
              >
                {i + 1}
              </Button>
            {/each}
          </div>
          <Button
            color="light"
            size="xs"
            disabled={currentPage === totalPages || weightLoading}
            on:click={() => goToPage(currentPage + 1)}
            class="w-full sm:w-20 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      {/if}
    {/if}

    {#if weightAlert.show}
      <div class="mt-3 sm:mt-4 animate-fade-in">
        <Alert
          color={weightAlert.type === "success" ? "green" : "red"}
          class="shadow-md rounded-lg dark:bg-gray-700 dark:border-gray-600 text-xs sm:text-base"
          dismissable
        >
          <svelte:fragment slot="icon">
            {#if weightAlert.type === "success"}
              <CheckCircleOutline class="w-4 h-4 sm:w-5 sm:h-5 dark:text-green-400" />
            {:else}
              <ExclamationCircleOutline class="w-4 h-4 sm:w-5 sm:h-5 dark:text-red-400" />
            {/if}
          </svelte:fragment>
          <span class="font-medium dark:text-white">{weightAlert.message}</span>
          <svelte:fragment slot="close-button">
            <Button
              color="none"
              class="ml-auto p-0"
              on:click={() => (weightAlert.show = false)}
              aria-label="Dismiss alert"
            >
              <CloseCircleOutline class="w-4 h-4 sm:w-5 sm:h-5 dark:text-gray-300" />
            </Button>
          </svelte:fragment>
        </Alert>
      </div>
    {/if}

    <Button
      color="blue"
      size="sm"
      class="mt-3 sm:mt-4 w-full sm:w-auto hover:bg-blue-600 transition-colors text-xs sm:text-base"
      href="/"
      aria-label="Back to tracker"
    >
      Back to Tracker
    </Button>
  </Card>
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
