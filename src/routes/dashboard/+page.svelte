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
  let heightUnit: "cm" | "ft" = "cm"; // Default to cm
  let feet: number = 0;
  let inches: number = 0;
  let weights: { weight: number; timestamp: Date }[] = [];
  let heights: { height: number; timestamp: Date }[] = [];
  let weightChartInstance: Chart | null = null;
  let heightChartInstance: Chart | null = null;
  let currentUser: { uid: string } | null = null;

  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        fetchWeights();
        fetchHeights();
      } else {
        currentUser = null;
        goto("/");
      }
    });
  });

  async function addWeight() {
    if (weight <= 0) {
      alert("Weight must be a positive number.");
      return;
    }

    if (currentUser) {
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
    let heightInCm: number;

    if (heightUnit === "cm") {
      if (height <= 0) {
        alert("Height must be a positive number.");
        return;
      }
      heightInCm = height;
    } else {
      if (feet <= 0 || inches < 0 || inches >= 12) {
        alert("Feet must be positive, and inches must be between 0 and 11.");
        return;
      }
      heightInCm = feet * 30.48 + inches * 2.54; // Convert ft/in to cm
    }

    if (currentUser) {
      try {
        await addDoc(collection(db, "heights"), {
          height: heightInCm,
          timestamp: new Date(),
          userId: currentUser.uid,
        });
        height = 0;
        feet = 0;
        inches = 0;
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
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
            borderWidth: 2,
            pointBackgroundColor: "rgba(75, 192, 192, 1)",
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context) => `Weight: ${context.raw} kg`,
            },
          },
        },
        hover: {
          mode: "nearest",
          intersect: true,
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  function drawHeightChart() {
    const canvas = document.getElementById("heightChart") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
            borderWidth: 2,
            pointBackgroundColor: "rgba(255, 99, 132, 1)",
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context) => `Height: ${context.raw} cm`,
            },
          },
        },
        hover: {
          mode: "nearest",
          intersect: true,
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
</script>

<main class="container">
  <h1>Weight and Height Management</h1>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-gray-500 text-sm font-semibold">Current Weight</h2>
      <p class="text-2xl font-bold">
        {weights.length > 0
          ? weights[weights.length - 1].weight + " kg"
          : "N/A"}
      </p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-gray-500 text-sm font-semibold">Current Height</h2>
      <p class="text-2xl font-bold">
        {heights.length > 0
          ? (heights[heights.length - 1].height / 100).toFixed(2) + " m"
          : "N/A"}
      </p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-gray-500 text-sm font-semibold">Current BMI</h2>
      <p class="text-2xl font-bold">
        {weights.length > 0 && heights.length > 0
          ? (
              weights[weights.length - 1].weight /
              Math.pow(heights[heights.length - 1].height / 100, 2)
            ).toFixed(2)
          : "N/A"}
      </p>
    </div>
  </div>
  <div class="cards">
    <div class="card">
      <h2>Weight</h2>
      <div class="chart-container">
        <canvas id="weightChart"></canvas>
      </div>
    </div>
    <div class="card">
      <h2>Height</h2>
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

  /* Removed unused form CSS selector */
  .chart-container {
    width: 100%;
    height: 300px; /* Fixed height for charts */
    position: relative;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }

  /* Responsive Design */
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

    .chart-container {
      height: 150px; /* Even smaller height for very small screens */
    }
  }
</style>
