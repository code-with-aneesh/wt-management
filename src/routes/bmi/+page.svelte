<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { DarkMode } from "flowbite-svelte";
  import { db } from "$lib/firebase";
  import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { browser } from '$app/environment';
  import { onMount as svelteOnMount } from 'svelte';
  let loading = true;
  let error: string | null = null;
  let lastWeight: number | null = null;
  let lastHeight: number | null = null;
  let bmi: number | null = null;
  let bmiCategory: string = "N/A";
  let bmr: number | null = null;
  let dailyCalories: number | null = null;
  let healthyWeightRange: { min: number; max: number } | null = null;
  let weightStatus: string = "N/A";
  let isDark = false;
  let showBmrTooltip = false;
  let showRangeTooltip = false;

  // User Data
  let currentUser: { uid: string } | null = null;
  let age: number | null = null;
  let gender: string | null = null;
  let activityLevel: string | null = null;
  let bmiPosition: number = 0;

  svelteOnMount(() => {
    if (browser) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        isDark = e.matches;
      });
    }
  });

  onMount(async () => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        goto("/");
        return;
      }
      currentUser = user;

      try {
        // Fetch Weight
        const weightQuery = query(
          collection(db, "weights"),
          where("userId", "==", user.uid)
        );
        const weightSnapshot = await getDocs(weightQuery);
        if (!weightSnapshot.empty) {
          // Sort by timestamp client-side and get the latest
          const sortedWeights = weightSnapshot.docs
            .map(doc => ({ weight: doc.data().weight, timestamp: doc.data().timestamp.toDate() }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          lastWeight = sortedWeights[0].weight;
          console.log("Weight fetched:", lastWeight);
        } else {
          console.log("No weight data found for user");
        }

        // Fetch Height
        const heightQuery = query(
          collection(db, "heights"),
          where("userId", "==", user.uid)
        );
        const heightSnapshot = await getDocs(heightQuery);
        if (!heightSnapshot.empty) {
          // Sort by timestamp client-side and get the latest
          const sortedHeights = heightSnapshot.docs
            .map(doc => ({ height: doc.data().height, timestamp: doc.data().timestamp.toDate() }))
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          lastHeight = sortedHeights[0].height;
          console.log("Height fetched:", lastHeight);
        } else {
          console.log("No height data found for user");
        }

        // Fetch Profile
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          age = data.age;
          gender = data.gender;
          activityLevel = data.activityLevel;
          console.log("Profile data fetched:", { age, gender, activityLevel });
        } else {
          console.log("No profile data found for user");
        }

        // Calculate Metrics only if we have the required data
        if (lastWeight && lastHeight) {
          calculateBMI(lastWeight, lastHeight);
          calculateHealthyWeightRange(lastHeight);
          if (age && gender) {
            calculateBMR();
            console.log("BMR calculated:", bmr);
          }
          console.log("BMI calculated:", bmi);
        } else {
          console.log("Insufficient data for BMI calculation. Weight:", lastWeight, "Height:", lastHeight);
          if (!lastWeight && !lastHeight) {
            error = "No weight or height data found. Please add your measurements first.";
          } else if (!lastWeight) {
            error = "No weight data found. Please add your weight first.";
          } else if (!lastHeight) {
            error = "No height data found. Please add your height first.";
          }
        }
      } catch (err) {
        console.error("Error in BMI analyzer:", err);
        if (err instanceof Error) {
          error = `Failed to load health data: ${err.message}`;
        } else {
          error = "Failed to load health data. Please try again.";
        }
      } finally {
        loading = false;
      }
    });
  });

  function calculateBMI(weight: number, height: number) {
    const heightMeters = height / 100;
    bmi = weight / (heightMeters * heightMeters);

    // BMI Categories
    const categories = [
      { max: 16, label: "Severe Underweight", position: 5 },
      { max: 17, label: "Moderate Underweight", position: 10 },
      { max: 18.5, label: "Mild Underweight", position: 20 },
      { max: 25, label: "Normal Weight", position: 40 },
      { max: 30, label: "Overweight", position: 60 },
      { max: 35, label: "Obese (Class 1)", position: 75 },
      { max: 40, label: "Obese (Class 2)", position: 90 },
      { max: Infinity, label: "Morbidly Obese", position: 100 },
    ];

    const category = categories.find((c) => bmi! <= c.max) || categories[0];
    bmiCategory = category.label;
    bmiPosition = Math.min(
      category.position +
        (bmi! - categories[categories.indexOf(category) - 1]?.max || 0),
      100
    );
  }

  function calculateBMR() {
    if (!lastWeight || !lastHeight || !age || !gender) return;

    // Harris-Benedict Equation
    if (gender === "male") {
      bmr = 88.362 + 13.397 * lastWeight + 4.799 * lastHeight - 5.677 * age;
    } else {
      bmr = 447.593 + 9.247 * lastWeight + 3.098 * lastHeight - 4.33 * age;
    }

    // Activity Multipliers
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
    };

    dailyCalories = bmr * (activityLevel ? multipliers[activityLevel] : 1.2);
  }

  function calculateHealthyWeightRange(height: number) {
    const heightMeters = height / 100;
    healthyWeightRange = {
      min: 18.5 * heightMeters ** 2,
      max: 24.9 * heightMeters ** 2,
    };
  }

  function getBmiClass(category: string): string {
    return category.toLowerCase().replace(/[^a-z]/g, "-");
  }

  // Returns a Tailwind color class or CSS variable for the BMI category
  function getBmiColor(category: number): string {
    switch (getBmiClass(category.toString())) {
      case "severe-underweight": return 'var(--tw-color-red-700, #b91c1c)';
      case "moderate-underweight": return 'var(--tw-color-orange-700, #c2410c)';
      case "mild-underweight": return 'var(--tw-color-yellow-700, #a16207)';
      case "normal-weight": return 'var(--tw-color-green-700, #15803d)';
      case "overweight": return 'var(--tw-color-orange-700, #c2410c)';
      case "obese-class-1": return 'var(--tw-color-red-700, #b91c1c)';
      case "obese-class-2": return 'var(--tw-color-red-900, #7f1d1d)';
      case "morbidly-obese": return 'var(--tw-color-red-900, #7f1d1d)';
      default: return 'var(--tw-color-gray-500, #6b7280)';
    }
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 md:p-4 lg:p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-6 md:mb-8">
      <div class="w-full max-w-2xl mx-auto rounded-xl md:rounded-2xl p-6 md:p-8 mb-4 md:mb-6 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 dark:from-green-700 dark:via-blue-700 dark:to-purple-700 shadow">
        <div class="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-3">
          <span class="text-3xl md:text-4xl">📊</span>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 drop-shadow">BMI Analyzer</h1>
        </div>
        <p class="text-gray-700 dark:text-gray-200 text-base md:text-lg">Get insights into your body composition and health metrics</p>
      </div>
    </div>

    {#if loading}
      <div class="flex justify-center items-center h-48 md:h-64" transition:fade>
        <div class="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-t-4 border-gray-500 dark:border-gray-600 border-solid"></div>
      </div>
    {:else if error}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 md:p-6 text-center" transition:fade>
        <div class="flex items-center justify-center gap-2 mb-2">
          <svg class="w-5 h-5 md:w-6 md:h-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="text-red-600 dark:text-red-400 font-medium text-base md:text-lg">Error Loading Data</span>
        </div>
        <p class="text-red-600 dark:text-red-400 text-sm md:text-base">{error}</p>
      </div>
    {:else}
      <!-- BMI Display Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <!-- Left Column - BMI Gauge -->
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6 text-center">Your BMI</h2>
          
          <!-- Circular BMI Gauge -->
          <div class="flex justify-center mb-4 md:mb-6">
            <div class="relative w-48 h-48 md:w-56 md:h-56">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <!-- Background Circle -->
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-gray-200 dark:text-gray-700"
                />
                <!-- BMI Progress Circle -->
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  stroke-linecap="round"
                  stroke-dasharray="251.2"
                  stroke-dashoffset={bmi ? (251.2 - (251.2 * Math.min(bmi / 40, 1))) : 251.2}
                  class={bmi ? getBmiColor(bmi) : "text-gray-400"}
                />
                <!-- Center Text -->
                <text
                  x="50"
                  y="45"
                  text-anchor="middle"
                  fill="currentColor"
                  class="text-lg md:text-xl font-bold text-gray-900 dark:text-white"
                >
                  {bmi ? bmi.toFixed(1) : "N/A"}
                </text>
                <text
                  x="50"
                  y="60"
                  text-anchor="middle"
                  fill="currentColor"
                  class="text-xs md:text-sm text-gray-600 dark:text-gray-400"
                >
                  BMI
                </text>
              </svg>
            </div>
          </div>

          <!-- BMI Category Badge -->
          <div class="text-center mb-4 md:mb-6">
            <span class="inline-block px-3 py-2 rounded-full text-sm md:text-base font-bold {bmi ? getBmiClass(bmi) : 'bg-gray-200 text-gray-700'}">
              {bmiCategory}
            </span>
          </div>

          <!-- Current Stats -->
          <div class="grid grid-cols-2 gap-3 md:gap-4">
            <div class="text-center p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Weight</p>
              <p class="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{lastWeight ? `${lastWeight.toFixed(1)} kg` : "N/A"} kg</p>
            </div>
            <div class="text-center p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">Height</p>
              <p class="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{lastHeight ? `${(lastHeight / 100).toFixed(2)} m` : "N/A"} m</p>
            </div>
          </div>
        </div>

        <!-- Right Column - Health Metrics -->
        <div class="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">Health Metrics</h2>
          
          <div class="space-y-4 md:space-y-6">
            <!-- BMR -->
            <div class="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400 dark:border-blue-600">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 md:w-5 md:h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <span class="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">BMR</span>
                  <button
                    class="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                    on:click={() => showBmrTooltip = !showBmrTooltip}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                </div>
                <span class="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{bmr ? `${bmr.toFixed(0)} kcal/day` : "N/A"} kcal/day</span>
              </div>
              {#if showBmrTooltip}
                <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">Basal Metabolic Rate - calories your body needs at rest</p>
              {/if}
            </div>

            <!-- Healthy Weight Range -->
            <div class="p-3 md:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-400 dark:border-green-600">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 md:w-5 md:h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span class="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">Healthy Range</span>
                  <button
                    class="text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300"
                    on:click={() => showRangeTooltip = !showRangeTooltip}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </button>
                </div>
                <span class="text-sm md:text-base font-bold text-gray-900 dark:text-white">{healthyWeightRange ? `${healthyWeightRange.min.toFixed(1)} - ${healthyWeightRange.max.toFixed(1)} kg` : "N/A"}</span>
              </div>
              {#if showRangeTooltip}
                <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-2">Recommended weight range for your height</p>
              {/if}
            </div>

            <!-- Weight Status -->
            <div class="p-3 md:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-400 dark:border-purple-600">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 md:w-5 md:h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <span class="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">Status</span>
                </div>
                <span class="text-sm md:text-base font-bold text-gray-900 dark:text-white">{weightStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Explanations Section -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">Understanding Your Results</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <!-- BMI Explanation -->
          <div class="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 text-sm md:text-base">What is BMI?</h3>
            <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Body Mass Index (BMI) is a measure of body fat based on height and weight. It helps assess if you're at a healthy weight for your height.
            </p>
          </div>

          <!-- BMR Explanation -->
          <div class="p-3 md:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 text-sm md:text-base">Understanding BMR</h3>
            <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Basal Metabolic Rate (BMR) represents the number of calories your body needs to maintain basic life functions while at rest.
            </p>
          </div>

          <!-- Healthy Weight Explanation -->
          <div class="p-3 md:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2 text-sm md:text-base">Healthy Weight Range</h3>
            <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              This range indicates the ideal weight for your height, helping you set realistic health and fitness goals.
            </p>
          </div>
        </div>

        <!-- BMI Categories -->
        <div class="mt-4 md:mt-6">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 text-base md:text-lg">BMI Categories</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <div class="text-center p-2 md:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <span class="text-xs md:text-sm font-medium text-blue-800 dark:text-blue-200">Underweight</span>
              <p class="text-xs text-blue-600 dark:text-blue-300">&lt; 18.5</p>
            </div>
            <div class="text-center p-2 md:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <span class="text-xs md:text-sm font-medium text-green-800 dark:text-green-200">Normal</span>
              <p class="text-xs text-green-600 dark:text-green-300">18.5 - 24.9</p>
            </div>
            <div class="text-center p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <span class="text-xs md:text-sm font-medium text-yellow-800 dark:text-yellow-200">Overweight</span>
              <p class="text-xs text-yellow-600 dark:text-yellow-300">25.0 - 29.9</p>
            </div>
            <div class="text-center p-2 md:p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <span class="text-xs md:text-sm font-medium text-red-800 dark:text-red-200">Obese</span>
              <p class="text-xs text-red-600 dark:text-red-300">≥ 30.0</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .text-severe-underweight {
    color: #dc2626;
  }
  .text-moderate-underweight {
    color: #ea580c;
  }
  .text-mild-underweight {
    color: #ca8a04;
  }
  .text-normal-weight {
    color: #16a34a;
  }
  .text-overweight {
    color: #ea580c;
  }
  .text-obese-class-1 {
    color: #dc2626;
  }
  .text-obese-class-2 {
    color: #991b1b;
  }
  .text-morbidly-obese {
    color: #7f1d1d;
  }

  .bg-severe-underweight {
    background-color: #fef2f2;
  }
  .bg-moderate-underweight {
    background-color: #fff7ed;
  }
  .bg-mild-underweight {
    background-color: #fefce8;
  }
  .bg-normal-weight {
    background-color: #f0fdf4;
  }
  .bg-overweight {
    background-color: #fff7ed;
  }
  .bg-obese-class-1 {
    background-color: #fef2f2;
  }
  .bg-obese-class-2 {
    background-color: #fef2f2;
  }
  .bg-morbidly-obese {
    background-color: #fef2f2;
  }

  /* Dark mode overrides */
</style>
