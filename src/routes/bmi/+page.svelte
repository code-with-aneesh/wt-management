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
  let height: number = 1.8;
  let bmi: number | null = null;
  let bmiCategory: string = "Loading...";
  let bmiPosition: number = 0; // Position on scale (0-100)
  let bmiPercentage: number = 0; // Percentage for radial progress bar

  onMount(async () => {
    const q = query(
      collection(db, "weights"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      lastWeight = data.weight;
    });
  });

  // Reactive BMI Calculation
  $: if (lastWeight !== null) {
    bmi = lastWeight / (height * height);
    bmiPercentage = Math.min((bmi / 40) * 100, 100); // Cap at 100%

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
</script>

<main>
  <div class="container">
    <!-- Left Card (Linear Scale) -->
    <div class="card">
      <svg
        class="icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M12 2a5 5 0 015 5v2h3a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V10a1 1 0 011-1h3V7a5 5 0 015-5zm6 10H6v8h12v-8zm-6-8a3 3 0 00-3 3v2h6V7a3 3 0 00-3-3z"
        />
      </svg>
      <h1>
        Last Weight: {lastWeight !== null ? lastWeight + " kg" : "Loading..."}
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

    <!-- Right Card (Radial Progress Bar) -->
    <div class="card">
      <h1>BMI Progress</h1>
      <div
        class="radial-progress"
        style="background: conic-gradient(
                #00CC66 0%,
                #FFD700 {bmiPercentage / 1.5}%,
                #FF4500 {bmiPercentage}%,
                #FF8C00 100%
            );"
      >
        <span>{bmiPercentage.toFixed(1)}%</span>
      </div>
      <h2>BMI: {bmi !== null ? bmi.toFixed(2) : "Calculating..."}</h2>
      <h2>Classification: {bmiCategory}</h2>
    </div>
  </div>
</main>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap");

  .container {
    display: flex;
    gap: 2rem;
    max-width: 800px;
    width: 100%;
    padding: 1rem;
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

  .icon {
    width: 24px;
    height: 24px;
    margin-bottom: 1rem;
  }

  .radial-progress {
    width: 150px;
    height: 150px;
    margin: 1rem auto;
    position: relative;
    border-radius: 50%;
    background: conic-gradient(
      #00cc66 0%,
      #ffd700 60%,
      #ff4500 90%,
      #ff8c00 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .radial-progress::before {
    content: "";
    position: absolute;
    width: 120px;
    height: 120px;
    background: white;
    border-radius: 50%;
  }

  .radial-progress span {
    position: relative;
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
  }
</style>
