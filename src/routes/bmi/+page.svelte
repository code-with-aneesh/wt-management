<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import { 
    collection, query, orderBy, limit, getDocs, doc, getDoc 
  } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";

  // User Data
  let currentUser: { uid: string } | null = null;
  let lastWeight: number | null = null;
  let lastHeight: number | null = null;
  let age: number | null = null;
  let gender: string | null = null;
  let activityLevel: "sedentary" | "light" | "moderate" | "active" | null = null;
  
  // Calculations
  let bmi: number | null = null;
  let bmr: number | null = null;
  let dailyCalories: number | null = null;
  let bmiCategory: string = "Loading...";
  let bmiPosition: number = 0;
  let healthyWeightRange: { min: number; max: number } | null = null;
  
  // UI States
  let loading = true;
  let error: string | null = null;

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
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const weightSnapshot = await getDocs(weightQuery);
        if (!weightSnapshot.empty) lastWeight = weightSnapshot.docs[0].data().weight;

        // Fetch Height
        const heightQuery = query(
          collection(db, "heights"),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const heightSnapshot = await getDocs(heightQuery);
        if (!heightSnapshot.empty) lastHeight = heightSnapshot.docs[0].data().height;

        // Fetch Profile
        const profileDoc = await getDoc(doc(db, "profiles", user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          age = data.age;
          gender = data.gender;
          activityLevel = data.activityLevel;
        }

        // Calculate Metrics
        if (lastWeight && lastHeight) {
          calculateBMI(lastWeight, lastHeight);
          calculateHealthyWeightRange(lastHeight);
          if (age && gender) calculateBMR();
        }

      } catch (err) {
        error = "Failed to load health data";
        console.error(err);
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
      { max: Infinity, label: "Morbidly Obese", position: 100 }
    ];

    const category = categories.find(c => bmi! <= c.max) || categories[0];
    bmiCategory = category.label;
    bmiPosition = Math.min(category.position + (bmi! - categories[categories.indexOf(category)-1]?.max || 0), 100);
  }

  function calculateBMR() {
    if (!lastWeight || !lastHeight || !age || !gender) return;
    
    // Harris-Benedict Equation
    if (gender === "male") {
      bmr = 88.362 + (13.397 * lastWeight) + (4.799 * lastHeight) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * lastWeight) + (3.098 * lastHeight) - (4.330 * age);
    }

    // Activity Multipliers
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };
    
    dailyCalories = bmr * (activityLevel ? multipliers[activityLevel] : 1.2);
  }

  function calculateHealthyWeightRange(height: number) {
    const heightMeters = height / 100;
    healthyWeightRange = {
      min: 18.5 * (heightMeters ** 2),
      max: 24.9 * (heightMeters ** 2)
    };
  }

  function getBmiClass(category: string): string {
    return category.toLowerCase().replace(/[^a-z]/g, '-');
  }
</script>

<main class="min-h-screen bg-gray-50 p-6">
  {#if loading}
    <div class="flex justify-center items-center h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  
  {:else if error}
    <div class="max-w-4xl mx-auto bg-red-50 p-6 rounded-xl shadow-sm">
      <div class="flex items-center gap-3 text-red-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-lg font-medium">{error}</p>
      </div>
    </div>

  {:else}
    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Health Metrics Card -->
      <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
        <h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
          </svg>
          Body Metrics
        </h2>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-blue-50 p-4 rounded-xl">
            <p class="text-sm text-gray-600 mb-1">Weight</p>
            <p class="text-2xl font-bold text-gray-900">
              {lastWeight ? `${lastWeight.toFixed(1)} kg` : '--'}
            </p>
          </div>

          <div class="bg-purple-50 p-4 rounded-xl">
            <p class="text-sm text-gray-600 mb-1">Height</p>
            <p class="text-2xl font-bold text-gray-900">
              {lastHeight ? `${(lastHeight / 100).toFixed(2)} m` : '--'}
            </p>
          </div>

          {#if bmr}
            <div class="bg-green-50 p-4 rounded-xl">
              <p class="text-sm text-gray-600 mb-1">BMR</p>
              <p class="text-2xl font-bold text-gray-900">{bmr.toFixed(0)} kcal</p>
            </div>
          {/if}

          {#if dailyCalories}
            <div class="bg-orange-50 p-4 rounded-xl">
              <p class="text-sm text-gray-600 mb-1">Daily Calories</p>
              <p class="text-2xl font-bold text-gray-900">{dailyCalories.toFixed(0)} kcal</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- BMI Card -->
      <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
        <h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          BMI Analysis
        </h2>

        {#if bmi}
          <div class="text-center mb-6">
            <div class="text-5xl font-bold mb-2 text-{getBmiClass(bmiCategory)}-600">
              {bmi.toFixed(1)}
            </div>
            <div class="text-sm font-medium text-gray-600">{bmiCategory}</div>
          </div>

          <div class="relative h-4 bg-gradient-to-r from-yellow-400 via-green-400 to-red-500 rounded-full mb-2">
            <div class="absolute top-[-4px] w-3 h-6 bg-gray-900 rounded-full transform -translate-x-1/2" 
                 style="left: {bmiPosition}%"></div>
          </div>

          <div class="flex justify-between text-xs text-gray-600 px-2">
            <span>16</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>35</span>
            <span>40+</span>
          </div>
        {:else}
          <p class="text-gray-500 text-center">BMI data unavailable</p>
        {/if}

        {#if healthyWeightRange}
          <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-sm text-gray-600 mb-2">Healthy Weight Range</p>
            <p class="text-xl font-semibold text-gray-900">
              {healthyWeightRange.min.toFixed(1)} - {healthyWeightRange.max.toFixed(1)} kg
            </p>
          </div>
        {/if}
      </div>

      <!-- Profile Card -->
      <div class="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
        <h2 class="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Health Profile
        </h2>

        <div class="space-y-4">
          {#if age}
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-600">Age</span>
              <span class="font-medium">{age}</span>
            </div>
          {/if}

          {#if gender}
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-600">Gender</span>
              <span class="font-medium capitalize">{gender}</span>
            </div>
          {/if}

          {#if activityLevel}
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span class="text-gray-600">Activity Level</span>
              <span class="font-medium text-right capitalize">
                {activityLevel.replace(/_/g, ' ')}
              </span>
            </div>
          {/if}
        </div>

        {#if healthyWeightRange && lastWeight}
          <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-sm text-gray-600 mb-3">Weight Comparison</p>
            {#if lastWeight < healthyWeightRange.min}
              <div class="bg-yellow-50 p-4 rounded-lg">
                <p class="text-yellow-800 font-medium">
                  Under by {(healthyWeightRange.min - lastWeight).toFixed(1)} kg
                </p>
              </div>
            {:else if lastWeight > healthyWeightRange.max}
              <div class="bg-red-50 p-4 rounded-lg">
                <p class="text-red-800 font-medium">
                  Over by {(lastWeight - healthyWeightRange.max).toFixed(1)} kg
                </p>
              </div>
            {:else}
              <div class="bg-green-50 p-4 rounded-lg">
                <p class="text-green-800 font-medium">Within healthy range</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</main>

<style>
  .text-severe-underweight { color: #dc2626; }
  .text-moderate-underweight { color: #ea580c; }
  .text-mild-underweight { color: #ca8a04; }
  .text-normal-weight { color: #16a34a; }
  .text-overweight { color: #ea580c; }
  .text-obese-class-1 { color: #dc2626; }
  .text-obese-class-2 { color: #991b1b; }
  .text-morbidly-obese { color: #7f1d1d; }

  .bg-severe-underweight { background-color: #fef2f2; }
  .bg-moderate-underweight { background-color: #fff7ed; }
  .bg-mild-underweight { background-color: #fefce8; }
  .bg-normal-weight { background-color: #f0fdf4; }
  .bg-overweight { background-color: #fff7ed; }
  .bg-obese-class-1 { background-color: #fef2f2; }
  .bg-obese-class-2 { background-color: #fef2f2; }
  .bg-morbidly-obese { background-color: #fef2f2; }
</style>