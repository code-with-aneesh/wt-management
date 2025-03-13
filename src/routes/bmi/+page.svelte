<script lang="ts">
  import { onMount } from "svelte";
  import { db } from "$lib/firebase";
  import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

  let lastWeight: number | null = null;
  let lastHeight: number | null = null;
  let bmi: number | null = null;
  let bmiCategory: string = "Loading...";
  let bmiPosition: number = 0; // Position on scale (0-100)
  let healthyWeightRange: { min: number; max: number } | null = null; // Healthy weight range

  onMount(async () => {
    // Fetch last weight
    const weightQuery = query(
      collection(db, "weights"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const weightSnapshot = await getDocs(weightQuery);
    weightSnapshot.forEach((doc) => {
      const data = doc.data();
      lastWeight = data.weight;
    });

    // Fetch last height
    const heightQuery = query(
      collection(db, "heights"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const heightSnapshot = await getDocs(heightQuery);
    heightSnapshot.forEach((doc) => {
      const data = doc.data();
      lastHeight = data.height;
    });

    // Calculate BMI and healthy weight range if both weight and height are available
    if (lastWeight !== null && lastHeight !== null) {
      calculateBMI(lastWeight, lastHeight);
      calculateHealthyWeightRange(lastHeight);
    }
  });

  // Function to calculate BMI
  function calculateBMI(weight: number, height: number) {
    bmi = weight / (height * height);

    // Determine BMI category
    if (bmi < 16) {
      bmiCategory = "Severe Underweight";
      bmiPosition = 5;
    } else if (bmi < 17) {
      bmiCategory = "Moderate Underweight";
      bmiPosition = 10;
    } else if (bmi < 18.5) {
      bmiCategory = "Mild Underweight";
      bmiPosition = 20;
    } else if (bmi < 25) {
      bmiCategory = "Normal Weight";
      bmiPosition = 40;
    } else if (bmi < 30) {
      bmiCategory = "Overweight";
      bmiPosition = 60;
    } else if (bmi < 35) {
      bmiCategory = "Obese (Class 1)";
      bmiPosition = 75;
    } else if (bmi < 40) {
      bmiCategory = "Obese (Class 2)";
      bmiPosition = 90;
    } else {
      bmiCategory = "Morbidly Obese (Class 3)";
      bmiPosition = 100;
    }
  }

  // Function to calculate healthy weight range
  function calculateHealthyWeightRange(height: number) {
    const minWeight = 18.5 * (height * height); // Minimum healthy weight
    const maxWeight = 24.9 * (height * height); // Maximum healthy weight
    healthyWeightRange = { min: minWeight, max: maxWeight };
  }
</script>

<main>
  <div class="container">
    <!-- Left Card (Linear Scale) -->
    <div class="card">
      <h1>
        Last Weight: {lastWeight !== null ? lastWeight + " kg" : "Loading..."}
      </h1>
      <h1>
        Last Height: {lastHeight !== null ? lastHeight + " m" : "Loading..."}
      </h1>
      <h1>BMI: {bmi !== null ? bmi.toFixed(2) : "Calculating..."}</h1>
      <h2>Classification: {bmiCategory}</h2>

      <!-- BMI Scale -->
      <div class="bmi-scale">
        <div class="marker" style="left: {bmiPosition}%;"></div>
      </div>

      <!-- Scale Labels -->
      <div class="labels">
        <span>Underweight</span>
        <span>Normal</span>
        <span>Overweight</span>
        <span>Obese</span>
      </div>
    </div>

    <!-- Right Card (Healthy Weight Range) -->
    <div class="card">
      <h1>Healthy Weight Range</h1>
      {#if healthyWeightRange !== null}
        <h2>
          For your height {lastHeight?.toFixed(2)} m, a healthy weight range is:
        </h2>
        <h1>
          {healthyWeightRange.min.toFixed(1)} kg to {healthyWeightRange.max.toFixed(1)} kg
        </h1>
      {:else}
        <h2>Calculating healthy weight range...</h2>
      {/if}
    </div>
  </div>
</main>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap");

  .container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 800px;
    width: 100%;
    padding: 1rem;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .container {
      flex-direction: row;
    }
  }

  .card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    flex: 1;
    text-align: center;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    margin: 0.5rem 0;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 500;
    color: #555;
    margin: 0.5rem 0;
  }

  .bmi-scale {
    width: 100%;
    height: 20px;
    background: linear-gradient(
      to right,
      #ff8c00 10%,
      /* Underweight */ #00cc66 40%,
      /* Normal */ #ffd700 60%,
      /* Overweight */ #ff4500 90% /* Obese */
    );
    position: relative;
    border-radius: 10px;
    margin-top: 1.5rem;
    overflow: hidden;
  }

  .marker {
    position: absolute;
    top: 0;
    height: 20px;
    width: 10px;
    background: black;
    border-radius: 5px;
    transition: left 0.5s ease-in-out;
    transform: translateX(-50%);
  }

  .labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    color: #666;
  }

</style>
