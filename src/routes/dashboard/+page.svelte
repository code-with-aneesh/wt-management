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

  let weight = 0;
  let height = 0;
  let heightUnit: "cm" | "ft" = "cm"; // Default to cm
  let feet = 0;
  let inches = 0;
  let weights: { weight: number; timestamp: Date }[] = [];
  let heights: { height: number; timestamp: Date }[] = [];
  let weightChartInstance: Chart | null = null;
  let heightChartInstance: Chart | null = null;
  let currentUser: { uid: string } | null = null;

  // Canvas references using Svelte's bind directive
  let weightCanvas: HTMLCanvasElement;
  let heightCanvas: HTMLCanvasElement;

  // Reactive computed values for displaying current stats
  $: currentWeight = weights.length ? weights[weights.length - 1].weight : null;
  $: currentHeight = heights.length ? heights[heights.length - 1].height : null;
  $: currentBMI =
    currentWeight && currentHeight
      ? (currentWeight / Math.pow(currentHeight / 100, 2)).toFixed(2)
      : null;

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
        await fetchWeights();
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
      heightInCm = feet * 30.48 + inches * 2.54;
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
        await fetchHeights();
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
      drawChart("weight");
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
      drawChart("height");
    } catch (error) {
      console.error("Error fetching heights: ", error);
    }
  }

  // Generic chart drawing function for both weight and height
  function drawChart(type: "weight" | "height") {
    let canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D | null,
      data: number[],
      labels: string[],
      instance: Chart | null,
      label: string,
      borderColor: string,
      pointColor: string,
      tooltipUnit: string;

    if (type === "weight") {
      canvas = weightCanvas;
      data = weights.map((item) => item.weight);
      labels = weights.map((item) => item.timestamp.toLocaleDateString());
      instance = weightChartInstance;
      label = "Weight";
      borderColor = "rgba(75, 192, 192, 1)";
      pointColor = "rgba(75, 192, 192, 1)";
      tooltipUnit = "kg";
    } else {
      canvas = heightCanvas;
      data = heights.map((item) => item.height);
      labels = heights.map((item) => item.timestamp.toLocaleDateString());
      instance = heightChartInstance;
      label = "Height";
      borderColor = "rgba(255, 99, 132, 1)";
      pointColor = "rgba(255, 99, 132, 1)";
      tooltipUnit = "cm";
    }

    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (instance) {
      instance.destroy();
    }
    const newChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            borderColor,
            borderWidth: 2,
            pointBackgroundColor: pointColor,
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
              label: (context) => `${label}: ${context.raw} ${tooltipUnit}`,
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
    if (type === "weight") {
      weightChartInstance = newChart;
    } else {
      heightChartInstance = newChart;
    }
  }
</script>

<main class="container">
  <h1>Weight Management</h1>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-gray-500 text-sm font-semibold">Current Weight</h2>
      <p class="text-2xl font-bold">
        {currentWeight !== null ? `${currentWeight} kg` : "N/A"}
      </p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-gray-500 text-sm font-semibold">Current Height</h2>
      <p class="text-2xl font-bold">
        {currentHeight !== null
          ? `${(currentHeight / 100).toFixed(2)} m`
          : "N/A"}
      </p>
    </div>
    <div class="bg-white p-6 rounded-lg shadow-md">
      <h2 class="text-gray-500 text-sm font-semibold">Current BMI</h2>
      <p class="text-2xl font-bold">
        {currentBMI !== null ? currentBMI : "N/A"}
      </p>
    </div>
  </div>
  <div class="cards">
    <div class="card">
      <h2>Weight</h2>
      <div class="chart-container">
        <canvas bind:this={weightCanvas}></canvas>
      </div>
    </div>
    <div class="card">
      <h2>Height</h2>
      <div class="chart-container">
        <canvas bind:this={heightCanvas}></canvas>
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

  .chart-container {
    width: 100%;
    height: 300px;
    position: relative;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 1.5rem;
    }

    .card {
      flex: 1 1 100%;
      max-width: 100%;
    }

    .chart-container {
      height: 200px;
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
      height: 150px;
    }
  }
</style>
