<script lang="ts">
  import { onMount } from "svelte";
  import { db } from "$lib/firebase";
  import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
  } from "firebase/firestore";

  let lastWeight: number | null = null;
  let lastHeight: number | null = null;
  let bmi: number | null = null;
  let bmiCategory: string = "Loading...";
  let bmiPosition: number = 0;
  let healthyWeightRange: { min: number; max: number } | null = null;
  let loading = true;
  let error: string | null = null;

  // Helper function to convert BMI category to CSS class
  function getBmiClass(category: string): string {
    return category.toLowerCase().replace(/[^a-z]/g, '-');
  }

  onMount(async () => {
    try {
      // Fetch last weight
      const weightQuery = query(
        collection(db, "weights"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const weightSnapshot = await getDocs(weightQuery);
      
      if (!weightSnapshot.empty) {
        weightSnapshot.forEach((doc) => {
          const data = doc.data();
          lastWeight = data.weight;
        });
      } else {
        error = "No weight data found";
      }

      // Fetch last height
      const heightQuery = query(
        collection(db, "heights"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const heightSnapshot = await getDocs(heightQuery);
      
      if (!heightSnapshot.empty) {
        heightSnapshot.forEach((doc) => {
          const data = doc.data();
          lastHeight = data.height;
        });
      } else {
        error = error ? `${error} and no height data found` : "No height data found";
      }

      // Calculate if we have both values
      if (lastWeight !== null && lastHeight !== null) {
        calculateBMI(lastWeight, lastHeight);
        calculateHealthyWeightRange(lastHeight);
      }
    } catch (err) {
      error = "Failed to load data. Please try again later.";
      console.error("Error fetching data:", err);
    } finally {
      loading = false;
    }
  });

  function calculateBMI(weight: number, height: number) {
    const heightInMeters = height / 100;
    bmi = weight / (heightInMeters * heightInMeters);

    // Determine BMI category with more precise positioning
    if (bmi < 16) {
      bmiCategory = "Severe Underweight";
      bmiPosition = (bmi / 16) * 5;
    } else if (bmi < 17) {
      bmiCategory = "Moderate Underweight";
      bmiPosition = 5 + ((bmi - 16) / 1) * 5;
    } else if (bmi < 18.5) {
      bmiCategory = "Mild Underweight";
      bmiPosition = 10 + ((bmi - 17) / 1.5) * 10;
    } else if (bmi < 25) {
      bmiCategory = "Normal Weight";
      bmiPosition = 20 + ((bmi - 18.5) / 6.5) * 20;
    } else if (bmi < 30) {
      bmiCategory = "Overweight";
      bmiPosition = 40 + ((bmi - 25) / 5) * 20;
    } else if (bmi < 35) {
      bmiCategory = "Obese (Class 1)";
      bmiPosition = 60 + ((bmi - 30) / 5) * 15;
    } else if (bmi < 40) {
      bmiCategory = "Obese (Class 2)";
      bmiPosition = 75 + ((bmi - 35) / 5) * 15;
    } else {
      bmiCategory = "Morbidly Obese (Class 3)";
      bmiPosition = Math.min(100, 90 + ((bmi - 40) / 10) * 10);
    }
  }

  function calculateHealthyWeightRange(height: number) {
    const heightInMeters = height / 100;
    const minWeight = 18.5 * (heightInMeters * heightInMeters);
    const maxWeight = 24.9 * (heightInMeters * heightInMeters);
    healthyWeightRange = { min: minWeight, max: maxWeight };
  }
</script>

<main class="main-container">
  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading your health data...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>{error}</p>
    </div>
  {:else}
    <div class="container">
      <!-- Left Card (BMI Information) -->
      <div class="card">
        <div class="card-header">
          <h1>Your BMI</h1>
          {#if bmi !== null}
            <div class="bmi-value {getBmiClass(bmiCategory)}">
              {bmi.toFixed(1)}
            </div>
          {/if}
        </div>

        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Weight</span>
            <span class="stat-value">{lastWeight !== null ? `${lastWeight} kg` : '--'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Height</span>
            <span class="stat-value">{lastHeight !== null ? `${(lastHeight / 100).toFixed(2)} m` : '--'}</span>
          </div>
        </div>

        {#if bmi !== null}
          <div class="classification {getBmiClass(bmiCategory)}">
            {bmiCategory}
          </div>
        {/if}

        <!-- BMI Scale -->
        <div class="bmi-scale-container">
          <div class="bmi-scale">
            <div class="marker" style="left: {bmiPosition}%;"></div>
          </div>
          <div class="scale-labels">
            <span>16</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>35</span>
            <span>40+</span>
          </div>
          <div class="scale-categories">
            <span>Underweight</span>
            <span>Healthy</span>
            <span>Overweight</span>
            <span>Obese</span>
          </div>
        </div>
      </div>

      <!-- Right Card (Healthy Weight Range) -->
      <div class="card">
        <div class="card-header">
          <h1>Healthy Weight Range</h1>
          {#if healthyWeightRange !== null}
            <div class="range-display">
              {healthyWeightRange.min.toFixed(1)} - {healthyWeightRange.max.toFixed(1)} kg
            </div>
          {/if}
        </div>

        {#if healthyWeightRange !== null && lastWeight !== null}
          <div class="weight-comparison">
            {#if lastWeight < healthyWeightRange.min}
              <p>You are <strong>{Math.abs(lastWeight - healthyWeightRange.min).toFixed(1)} kg</strong> under the healthy range</p>
            {:else if lastWeight > healthyWeightRange.max}
              <p>You are <strong>{Math.abs(lastWeight - healthyWeightRange.max).toFixed(1)} kg</strong> over the healthy range</p>
            {:else}
              <p>Your weight is within the healthy range!</p>
            {/if}
          </div>
        {/if}

        <div class="health-tips">
          <h3>Health Tips</h3>
          {#if bmi !== null}
            {#if bmi < 18.5}
              <ul>
                <li>Focus on nutrient-dense foods to gain weight healthily</li>
                <li>Incorporate strength training to build muscle mass</li>
                <li>Eat regular meals and healthy snacks</li>
              </ul>
            {:else if bmi < 25}
              <ul>
                <li>Maintain your current healthy habits</li>
                <li>Continue regular physical activity</li>
                <li>Eat a balanced diet with variety</li>
              </ul>
            {:else}
              <ul>
                <li>Start with moderate physical activity like walking</li>
                <li>Focus on portion control and balanced meals</li>
                <li>Reduce intake of processed foods and sugary drinks</li>
              </ul>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

  :global(body) {
    font-family: "Inter", sans-serif;
    background-color: #f5f7fa;
    margin: 0;
    padding: 0;
    color: #333;
  }

  .main-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 50vh;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #3498db;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-color: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    color: #e74c3c;
    text-align: center;
  }

  .error-container svg {
    margin-bottom: 1rem;
  }

  .container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  @media (min-width: 768px) {
    .container {
      flex-direction: row;
    }
  }

  .card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    padding: 1.5rem;
    flex: 1;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  .card-header {
    margin-bottom: 1.5rem;
    text-align: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 0.5rem 0;
  }

  .bmi-value {
    font-size: 3rem;
    font-weight: 700;
    margin: 0.5rem 0;
  }

  .bmi-value.normal-weight {
    color: #27ae60;
  }

  .bmi-value.mild-underweight,
  .bmi-value.moderate-underweight,
  .bmi-value.severe-underweight {
    color: #f39c12;
  }

  .bmi-value.overweight,
  .bmi-value.obese--class-1,
  .bmi-value.obese--class-2,
  .bmi-value.morbidly-obese--class-3 {
    color: #e74c3c;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-item {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: 0.875rem;
    color: #7f8c8d;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2c3e50;
  }

  .classification {
    font-size: 1.25rem;
    font-weight: 600;
    text-align: center;
    padding: 0.5rem;
    border-radius: 8px;
    margin: 1.5rem 0;
  }

  .classification.normal-weight {
    background-color: rgba(39, 174, 96, 0.1);
    color: #27ae60;
  }

  .classification.mild-underweight,
  .classification.moderate-underweight,
  .classification.severe-underweight {
    background-color: rgba(243, 156, 18, 0.1);
    color: #f39c12;
  }

  .classification.overweight,
  .classification.obese--class-1,
  .classification.obese--class-2,
  .classification.morbidly-obese--class-3 {
    background-color: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
  }

  .bmi-scale-container {
    margin-top: 2rem;
  }

  .bmi-scale {
    width: 100%;
    height: 16px;
    background: linear-gradient(
      to right,
      #f39c12 0%,
      #f39c12 10%,
      #27ae60 10%,
      #27ae60 40%,
      #f1c40f 40%,
      #f1c40f 60%,
      #e74c3c 60%,
      #e74c3c 100%
    );
    position: relative;
    border-radius: 8px;
    margin: 0.5rem 0;
    overflow: hidden;
  }

  .marker {
    position: absolute;
    top: -4px;
    height: 24px;
    width: 12px;
    background: #2c3e50;
    border-radius: 6px;
    transition: left 0.5s ease-in-out;
    transform: translateX(-50%);
    z-index: 2;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .scale-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #7f8c8d;
    margin-top: 0.25rem;
  }

  .scale-categories {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 500;
    color: #2c3e50;
    margin-top: 0.25rem;
  }

  .range-display {
    font-size: 2rem;
    font-weight: 600;
    color: #27ae60;
    margin: 0.5rem 0;
  }

  .weight-comparison {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin: 1.5rem 0;
    text-align: center;
  }

  .weight-comparison p {
    margin: 0;
    font-size: 1.1rem;
  }

  .health-tips {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #eee;
  }

  .health-tips h3 {
    font-size: 1.25rem;
    color: #2c3e50;
    margin-bottom: 1rem;
  }

  .health-tips ul {
    padding-left: 1.25rem;
    margin: 0;
  }

  .health-tips li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }
</style>