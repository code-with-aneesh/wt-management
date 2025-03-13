<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
  } from "firebase/firestore";
  import Chart from "chart.js/auto";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";

  let weight: number = 0;
  let height: number = 0;
  let weights: { weight: number; timestamp: Date }[] = [];
  let heights: { height: number; timestamp: Date }[] = [];
  let weightChartInstance: Chart | null = null;
  let heightChartInstance: Chart | null = null;
  let currentUser: any = null;

  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        fetchWeights();
        fetchHeights();
      } else {
        currentUser = null;
        if (typeof window !== "undefined") {
          goto("/");
        }
      }
    });
  });

  async function addWeight() {
    if (weight && currentUser) {
      try {
        await addDoc(collection(db, "weights"), {
          weight,
          timestamp: new Date(),
          userId: currentUser.uid,
        });
        weight = 0;
        fetchWeights();
      } catch (error) {
        console.error("Error adding weight: ", error);
      }
    }
  }

  async function addHeight() {
    if (height && currentUser) {
      try {
        await addDoc(collection(db, "heights"), {
          height,
          timestamp: new Date(),
          userId: currentUser.uid,
        });
        height = 0;
        fetchHeights();
      } catch (error) {
        console.error("Error adding height: ", error);
      }
    }
  }

  async function fetchWeights() {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "weights"),
        where("userId", "==", currentUser.uid),
        orderBy("timestamp", "asc")
      );
      const querySnapshot = await getDocs(q);
      weights = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return { weight: data.weight, timestamp: data.timestamp.toDate() };
      });
      drawWeightChart();
    } catch (error) {
      console.error("Error fetching weights: ", error);
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
      const querySnapshot = await getDocs(q);
      heights = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return { height: data.height, timestamp: data.timestamp.toDate() };
      });
      drawHeightChart();
    } catch (error) {
      console.error("Error fetching heights: ", error);
    }
  }

  function drawWeightChart() {
    const canvas = document.getElementById("weightChart") as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (weightChartInstance) {
          weightChartInstance.destroy();
        }
        weightChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels: weights.map((w) => w.timestamp.toLocaleDateString()),
            datasets: [
              {
                label: "Weight",
                data: weights.map((w) => w.weight),
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
    }
  }

  function drawHeightChart() {
    const canvas = document.getElementById("heightChart") as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (heightChartInstance) {
          heightChartInstance.destroy();
        }
        heightChartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels: heights.map((h) => h.timestamp.toLocaleDateString()),
            datasets: [
              {
                label: "Height",
                data: heights.map((h) => h.height),
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        });
      }
    }
  }
</script>

<main class="container">
  <h1>Weight and Height Management</h1>
  <div class="cards">
    <div class="card">
      <h2>Weight</h2>
      <form on:submit|preventDefault={addWeight}>
        <label for="weight">Enter your weight:</label>
        <input type="number" id="weight" bind:value={weight} required />
        <button type="submit">Add Weight</button>
      </form>
      <div class="chart-container">
        <canvas id="weightChart"></canvas>
      </div>
    </div>
    <div class="card">
      <h2>Height</h2>
      <form on:submit|preventDefault={addHeight}>
        <label for="height">Enter your height:</label>
        <input type="number" id="height" bind:value={height} step="0.01" required />
        <button type="submit">Add Height</button>
      </form>
      <div class="chart-container">
        <canvas id="heightChart"></canvas>
      </div>
    </div>
  </div>
</main>
<style>
  /* Base styles */
  .container {
    text-align: center;
    margin: 20px auto;
    padding: 10px;
    max-width: 1200px;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 20px;
  }

  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
  }

  .card {
    flex: 1 1 100%;
    max-width: 500px;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background: #fff;
  }

  form {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 10px;
    font-size: 1rem;
  }

  input {
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
  }

  button {
    width: 100%;
    padding: 10px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 1rem;
    cursor: pointer;
  }

  button:hover {
    background: #357ae8;
  }

  .chart-container {
    width: 100%;
    height: 300px; /* Fixed height for charts */
    position: relative;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }

  /* Media queries for smaller screens */
  @media (max-width: 768px) {
    h1 {
      font-size: 1.5rem;
    }

    .card {
      flex: 1 1 100%;
      max-width: 100%;
    }

    input {
      font-size: 0.9rem;
    }

    button {
      font-size: 0.9rem;
    }

    .chart-container {
      height: 200px; /* Smaller height for charts on mobile */
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 1.2rem;
    }

    .card {
      padding: 15px;
    }

    label {
      font-size: 0.9rem;
    }

    input {
      font-size: 0.8rem;
    }

    button {
      font-size: 0.8rem;
    }

    .chart-container {
      height: 150px; /* Even smaller height for very small screens */
    }
  }
</style>