<script lang="ts">
  import { onMount } from "svelte";
  import { DarkMode } from "flowbite-svelte";
  import { fly, fade } from "svelte/transition";
  import { browser } from "$app/environment";

  import { db, auth } from "$lib/firebase";
  import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
  } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";

  // Data variables
  let weights: { weight: number; timestamp: Date }[] = [];
  let heights: { height: number; timestamp: Date }[] = [];
  let currentUser: { uid: string } | null = null;

  // Chart references
  let weightCanvas: HTMLCanvasElement;
  let heightCanvas: HTMLCanvasElement;
  let weightChartInstance: any = null;
  let heightChartInstance: any = null;

  // Computed properties
  $: currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  $: currentHeight = heights.length ? heights[heights.length - 1].height : null;
  $: currentBMI =
    currentWeight && currentHeight
      ? (currentWeight / Math.pow(currentHeight / 100, 2)).toFixed(2)
      : null;
  $: bmiCategory = getBMICategory(Number(currentBMI));
  $: heightInMeters = currentHeight ? (currentHeight / 100).toFixed(2) : null;

  // Initialize component
  onMount(() => {
    if (!browser) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      // Dynamically load chart-related dependencies
      const [
        { default: Chart },
        { default: zoomPlugin },
        { default: trendlinePlugin },
      ] = await Promise.all([
        import("chart.js/auto"),
        import("chartjs-plugin-zoom"),
        import("chartjs-plugin-trendline"),
      ]);

      Chart.register(zoomPlugin, trendlinePlugin);

      const drawChart = (type: "weight" | "height") => {
        const isWeight = type === "weight";
        const canvas = isWeight ? weightCanvas : heightCanvas;
        const data = isWeight ? weights : heights;
        const ctx = canvas?.getContext("2d");

        if (!ctx || !canvas) return;

        // Destroy existing chart
        if (isWeight && weightChartInstance) weightChartInstance.destroy();
        if (!isWeight && heightChartInstance) heightChartInstance.destroy();

        const chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: data.map((item) => item.timestamp.toLocaleDateString()),
            datasets: [
              {
                label: isWeight ? "Weight (kg)" : "Height (cm)",
                data: data.map((item) =>
                  isWeight
                    ? (item as { weight: number }).weight
                    : (item as { height: number }).height
                ),
                borderColor: isWeight ? "#3b82f6" : "#10b981",
                backgroundColor: isWeight ? "#93c5fd" : "#a7f3d0",
                borderWidth: 2,
                tension: 0.1,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              zoom: {
                zoom: {
                  wheel: { enabled: true },
                  pinch: { enabled: true },
                  mode: "x",
                },
                pan: {
                  enabled: true,
                  mode: "x",
                },
              },
            },
          },
        });

        if (isWeight) weightChartInstance = chart;
        else heightChartInstance = chart;
      };

      const fetchWeights = async () => {
        if (!currentUser) return;
        const q = query(
          collection(db, "weights"),
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "asc")
        );
        const snapshot = await getDocs(q);
        weights = snapshot.docs.map((doc) => ({
          weight: doc.data().weight,
          timestamp: doc.data().timestamp.toDate(),
        }));
        drawChart("weight");
      };

      const fetchHeights = async () => {
        if (!currentUser) return;
        const q = query(
          collection(db, "heights"),
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "asc")
        );
        const snapshot = await getDocs(q);
        heights = snapshot.docs.map((doc) => ({
          height: doc.data().height,
          timestamp: doc.data().timestamp.toDate(),
        }));
        drawChart("height");
      };

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUser = user;
          fetchWeights();
          fetchHeights();
        } else {
          currentUser = null;
          goto("/");
        }
      });

      cleanup = () => {
        unsubscribe();
        if (weightChartInstance) weightChartInstance.destroy();
        if (heightChartInstance) heightChartInstance.destroy();
      };
    })();

    return cleanup;
  });

  function getBMICategory(bmi: number): string {
    if (!bmi) return "N/A";
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }

  // Add these functions
  function handleZoom(type: "weight" | "height", direction: "in" | "out") {
    const chart = type === "weight" ? weightChartInstance : heightChartInstance;
    if (!chart) return;
    const factor = direction === "in" ? 1.1 : 0.9;
    chart.zoom(factor, { x: true, y: false });
  }

  function handleResetZoom(type: "weight" | "height") {
    const chart = type === "weight" ? weightChartInstance : heightChartInstance;
    chart?.resetZoom();
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
  <div class="max-w-7xl mx-auto">
    <header class="mb-8 flex justify-between items-center" transition:fade>
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Health Dashboard
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          View your weight and height progress
        </p>
      </div>
      <!-- Add DarkMode toggle -->
    </header>

    <!-- Stats Overview - Updated for dark mode -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" transition:fade>
      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
          Current Weight
        </h3>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {currentWeight ? `${currentWeight} kg` : "N/A"}
        </p>
        {#if weights.length > 1}
          <p class="text-sm mt-1 dark:text-gray-400">
            {weights[weights.length - 1].weight >
            weights[weights.length - 2].weight
              ? "↑"
              : "↓"}
            {Math.abs(
              weights[weights.length - 1].weight -
                weights[weights.length - 2].weight
            ).toFixed(1)} kg from last
          </p>
        {/if}
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
          Current Height
        </h3>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {currentHeight ? `${heightInMeters} m` : "N/A"}
        </p>
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-300 mb-1">
          BMI
        </h3>
        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {currentBMI || "N/A"}
          </p>
          {#if bmiCategory !== "N/A"}
            <span
              class="text-xs px-2 py-1 rounded-full
              {bmiCategory === 'Underweight'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                : bmiCategory === 'Normal'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                  : bmiCategory === 'Overweight'
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'}"
            >
              {bmiCategory}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Charts Section - Updated for dark mode -->
    <div class="grid grid-cols-1 gap-6">
      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
        transition:fly={{ y: 20 }}
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold dark:text-white">Weight Progress</h2>
          <div class="flex gap-1">
            <button
              on:click={() => handleZoom("weight", "in")}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
            <button
              on:click={() => handleZoom("weight", "out")}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18 12H6"
                />
              </svg>
            </button>
            <button
              on:click={() => handleResetZoom("weight")}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="h-64">
          <canvas bind:this={weightCanvas}></canvas>
        </div>
      </div>

      <!-- Height Chart Section -->
      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
        transition:fly={{ y: 20, delay: 100 }}
      >
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold dark:text-white">Height Progress</h2>
          <div class="flex gap-1">
            <button
              on:click={() => handleZoom("height", "in")}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
            <button
              on:click={() => handleZoom("height", "out")}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18 12H6"
                />
              </svg>
            </button>
            <button
              on:click={() => handleResetZoom("height")}
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="h-64">
          <canvas bind:this={heightCanvas}></canvas>
        </div>
      </div>
    </div>
  </div>
</div>
