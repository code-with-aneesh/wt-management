import { a as attr } from "../../../chunks/attributes.js";
import { c as pop, p as push } from "../../../chunks/index.js";
import { a as auth, d as db } from "../../../chunks/firebase.js";
import { query, collection, where, orderBy, getDocs } from "firebase/firestore";
import Chart from "chart.js/auto";
import { onAuthStateChanged } from "firebase/auth";
function _page($$payload, $$props) {
  push();
  let weight;
  let weights = [];
  let chartInstance = null;
  let currentUser = null;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      fetchWeights();
    } else {
      currentUser = null;
    }
  });
  async function fetchWeights() {
    if (!currentUser) return;
    const q = query(collection(db, "weights"), where("userId", "==", currentUser.uid), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    weights = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        weight: data.weight,
        timestamp: data.timestamp
      };
    });
    console.log("Fetched weights:", weights);
    drawChart();
  }
  function drawChart() {
    const canvas = document.getElementById("weightChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (chartInstance) {
          chartInstance.destroy();
        }
        chartInstance = new Chart(ctx, {
          type: "line",
          data: {
            labels: weights.map((w) => new Date(w.timestamp.seconds * 1e3).toLocaleDateString()),
            datasets: [
              {
                label: "Weight",
                data: weights.map((w) => w.weight),
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1
              }
            ]
          },
          options: { scales: { y: { beginAtZero: true } } }
        });
      } else {
        console.error("Could not get 2D context for canvas");
      }
    } else {
      console.error("Canvas element not found");
    }
  }
  $$payload.out += `<main class="container svelte-8rbn24"><h1>Weight Management</h1> <form class="svelte-8rbn24"><label for="weight">Enter your weight:</label> <input type="number" id="weight"${attr("value", weight)} required class="svelte-8rbn24"> <button type="submit" class="svelte-8rbn24">Add Weight</button></form> <canvas id="weightChart"></canvas></main>`;
  pop();
}
export {
  _page as default
};
