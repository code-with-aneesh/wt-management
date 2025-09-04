
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
    doc,
    getDoc,
  } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";

  // Data variables
  let weights: { weight: number; timestamp: Date }[] = [];
  let gymDates: { [key: string]: string } = {};
  let currentUser: { uid: string } | null = null;

  // Chart references
  let weightCanvas: HTMLCanvasElement;
  let gymCanvas: HTMLCanvasElement;
  let weightChartInstance: any = null;
  let gymChartInstance: any = null;

  // Computed properties for weight
  $: currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  $: currentBMI = currentWeight ? (currentWeight / Math.pow(1.75, 2)).toFixed(2) : null; // Assuming average height of 1.75m
  $: bmiCategory = getBMICategory(Number(currentBMI));

  // Computed properties for gym attendance
  $: totalGymDays = Object.values(gymDates).filter(status => status === "green").length;
  $: consecutiveGymDays = calculateConsecutiveGymDays(gymDates);
  $: gymAttendancePercentage = Object.keys(gymDates).length > 0
    ? ((totalGymDays / Object.keys(gymDates).length) * 100).toFixed(1)
    : "0.0";

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

      const drawChart = (type: "weight" | "gym") => {
        const isWeight = type === "weight";
        const canvas = isWeight ? weightCanvas : gymCanvas;
        const ctx = canvas?.getContext("2d");

        if (!ctx || !canvas) return;

        // Destroy existing chart
        if (isWeight && weightChartInstance) weightChartInstance.destroy();
        if (!isWeight && gymChartInstance) gymChartInstance.destroy();

        if (isWeight) {
          const chart = new Chart(ctx, {
            type: "line",
            data: {
              labels: weights.map((item) => item.timestamp.toLocaleDateString()),
              datasets: [
                {
                  label: "Weight (kg)",
                  data: weights.map((item) => item.weight),
                  borderColor: "#3b82f6",
                  backgroundColor: "#93c5fd",
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
          weightChartInstance = chart;
        } else {
          const totalDays = Object.keys(gymDates).length;
          const gymDays = Object.values(gymDates).filter(status => status === "green").length;
          const noGymDays = totalDays - gymDays;

          const chart = new Chart(ctx, {
            type: "pie",
            data: {
              labels: ["Gym Visits", "No Gym"],
              datasets: [
                {
                  data: [gymDays, noGymDays],
                  backgroundColor: ["#10b981", "#ef4444"],
                  borderColor: ["#a7f3d0", "#fca5a5"],
                  borderWidth: 1,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "top",
                  labels: {
                    color: "#374151", // dark:text-gray-300
                    font: {
                      size: 14,
                    },
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || "";
                      const value = context.raw as number;
                      const percentage = totalDays > 0 ? ((value / totalDays) * 100).toFixed(1) : 0;
                      return `${label}: ${value} days (${percentage}%)`;
                    },
                  },
                },
              },
            },
          });
          gymChartInstance = chart;
        }
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

      const fetchGymDates = async () => {
        if (!currentUser) return;
        const docRef = doc(db, "calendars", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          gymDates = docSnap.data().dates || {};
          drawChart("gym");
        } else {
          gymDates = {};
        }
      };

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUser = user;
          fetchWeights();
          fetchGymDates();
        } else {
          currentUser = null;
          goto("/");
        }
      });

      cleanup = () => {
        unsubscribe();
        if (weightChartInstance) weightChartInstance.destroy();
        if (gymChartInstance) gymChartInstance.destroy();
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

  function calculateConsecutiveGymDays(dates: { [key: string]: string }): number {
    const sortedDates = Object.keys(dates).sort();
    let streak = 0;
    let currentDate = new Date();

    // Start from today and work backwards
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const dateStr = sortedDates[i];
      const date = new Date(dateStr);

      // Check if the date is today or consecutive with the previous date
      if (date.toDateString() === currentDate.toDateString() && dates[dateStr] === "green") {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function handleZoom(type: "weight" | "gym", direction: "in" | "out") {
    const chart = type === "weight" ? weightChartInstance : gymChartInstance;
    if (!chart) return;
    const factor = direction === "in" ? 1.1 : 0.9;
    chart.zoom(factor, { x: true, y: false });
  }

  function handleResetZoom(type: "weight" | "gym") {
    const chart = type === "weight" ? weightChartInstance : gymChartInstance;
    chart?.resetZoom();
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 md:p-4 lg:p-6">
  <div class="max-w-7xl mx-auto">
    <header class="mb-6 md:mb-8 flex flex-col items-center justify-center">
      <div class="w-full max-w-2xl mx-auto rounded-xl md:rounded-2xl p-6 md:p-8 mb-4 bg-gradient-to-r from-yellow-300 via-blue-200 to-purple-300 dark:from-yellow-700 dark:via-blue-900 dark:to-purple-900 shadow flex flex-col items-center">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-3xl md:text-4xl">🏆</span>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 drop-shadow">Health Dashboard</h1>
        </div>
        <p class="text-gray-700 dark:text-gray-200 text-base md:text-lg text-center">Track your weight and gym progress with detailed insights</p>
      </div>
    </header>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8" transition:fade>
      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border-l-4 border-blue-400 dark:border-blue-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm md:text-base font-medium text-gray-500 dark:text-gray-300">Current Weight</h3>
            <p class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {currentWeight ? `${currentWeight} kg` : "N/A"}
            </p>
          </div>
        </div>
        {#if weights.length > 1}
          <div class="flex items-center gap-2 text-xs md:text-sm">
            {#if weights[weights.length - 1].weight > weights[weights.length - 2].weight}
              <span class="text-red-500 dark:text-red-400">↑</span>
              <span class="text-red-600 dark:text-red-300 font-medium">
                +{Math.abs(weights[weights.length - 1].weight - weights[weights.length - 2].weight).toFixed(1)} kg
              </span>
            {:else}
              <span class="text-green-500 dark:text-green-400">↓</span>
              <span class="text-green-600 dark:text-green-300 font-medium">
                -{Math.abs(weights[weights.length - 1].weight - weights[weights.length - 2].weight).toFixed(1)} kg
              </span>
            {/if}
            <span class="text-gray-500 dark:text-gray-400">from last</span>
          </div>
        {/if}
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border-l-4 border-green-400 dark:border-green-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm md:text-base font-medium text-gray-500 dark:text-gray-300">BMI</h3>
            <div class="flex items-baseline gap-2">
              <p class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {currentBMI || "N/A"}
              </p>
              {#if bmiCategory !== "N/A"}
                <span
                  class="text-xs px-2 py-1 rounded-full font-bold
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
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border-l-4 border-purple-400 dark:border-purple-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm md:text-base font-medium text-gray-500 dark:text-gray-300">Total Gym Days</h3>
            <p class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {totalGymDays} days
            </p>
          </div>
        </div>
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">Tracked in calendar</p>
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border-l-4 border-orange-400 dark:border-orange-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm md:text-base font-medium text-gray-500 dark:text-gray-300">Current Gym Streak</h3>
            <p class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {consecutiveGymDays} days
            </p>
          </div>
        </div>
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">Consecutive gym visits</p>
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border-l-4 border-indigo-400 dark:border-indigo-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
            <svg class="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm md:text-base font-medium text-gray-500 dark:text-gray-300">Gym Attendance</h3>
            <p class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {gymAttendancePercentage}%
            </p>
          </div>
        </div>
        <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">Of tracked days</p>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 gap-6 md:gap-8">
      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
        transition:fly={{ y: 20 }}
      >
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-4">
          <div>
            <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">Weight Progress</h2>
            <p class="text-sm md:text-base text-gray-600 dark:text-gray-400">Track your weight changes over time with interactive zoom controls</p>
          </div>
          <div class="flex gap-2">
            <button
              on:click={() => handleZoom("weight", "in")}
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </button>
            <button
              on:click={() => handleZoom("weight", "out")}
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"/>
              </svg>
            </button>
            <button
              on:click={() => handleResetZoom("weight")}
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="h-64 md:h-80">
          <canvas bind:this={weightCanvas}></canvas>
        </div>
      </div>

      <div
        class="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
        transition:fly={{ y: 20, delay: 100 }}
      >
        <div class="mb-4 md:mb-6">
          <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">Gym Attendance Overview</h2>
          <p class="text-sm md:text-base text-gray-600 dark:text-gray-400">Visual representation of your gym attendance patterns and consistency</p>
        </div>
        <div class="h-64 md:h-80">
          <canvas bind:this={gymCanvas}></canvas>
        </div>
      </div>
    </div>
  </div>
</div>
