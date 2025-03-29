<script lang="ts">
  import { onMount } from "svelte";
  import { DarkMode } from "flowbite-svelte";
  import { fly, fade } from "svelte/transition";
  import { db, auth } from "$lib/firebase";
  import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
  } from "firebase/firestore";
  import Chart from "chart.js/auto";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";

  // Data variables
  let weights: { weight: number; timestamp: Date }[] = [];
  let heights: { height: number; timestamp: Date }[] = [];
  let currentUser: { uid: string } | null = null;

  // Chart references
  let weightCanvas: HTMLCanvasElement;
  let heightCanvas: HTMLCanvasElement;
  let weightChartInstance: Chart | null = null;
  let heightChartInstance: Chart | null = null;

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
    return () => unsubscribe();
  });

  // Helper functions
  function getBMICategory(bmi: number): string {
    if (!bmi) return "N/A";
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }

  // Data fetching
  async function fetchWeights() {
    if (!currentUser) return;

    try {
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
    } catch (error) {
      console.error("Error fetching weights:", error);
    }
  }

  async function fetchHeights() {
    if (!currentUser) return;

    try {
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
    } catch (error) {
      console.error("Error fetching heights:", error);
    }
  }

  function drawChart(type: "weight" | "height") {
    const isWeight = type === "weight";
    const canvas = isWeight ? weightCanvas : heightCanvas;
    const data:
      | { weight: number; timestamp: Date }[]
      | { height: number; timestamp: Date }[] = isWeight ? weights : heights;
    const ctx = canvas?.getContext("2d");

    if (!ctx || !canvas) return;

    // Destroy existing chart if it exists
    if (isWeight ? weightChartInstance : heightChartInstance) {
      (isWeight ? weightChartInstance : heightChartInstance)?.destroy();
    }

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((item) => item.timestamp.toLocaleDateString()),
        datasets: [
          {
            label: isWeight ? "Weight (kg)" : "Height (cm)",
            data: data.map((item) =>
              isWeight
                ? (item as { weight: number; timestamp: Date }).weight
                : (item as { height: number; timestamp: Date }).height
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
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`,
            },
          },
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    });

    if (isWeight) {
      weightChartInstance = chart;
    } else {
      heightChartInstance = chart;
    }
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
        <h2 class="text-lg font-semibold mb-4 dark:text-white">
          Weight Progress
        </h2>
        <div class="h-64">
          <canvas bind:this={weightCanvas}></canvas>
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700"
        transition:fly={{ y: 20, delay: 100 }}
      >
        <h2 class="text-lg font-semibold mb-4 dark:text-white">
          Height Progress
        </h2>
        <div class="h-64">
          <canvas bind:this={heightCanvas}></canvas>
        </div>
      </div>
    </div>
  </div>
</div>
