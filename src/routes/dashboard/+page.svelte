<script lang="ts">
    import { onMount } from "svelte";
    import { db, auth } from "$lib/firebase"; // Ensure you have Firestore setup in your firebase.ts
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

    let weight: number;
    let weights: { weight: number; timestamp: any }[] = [];
    let chartInstance: Chart | null = null;
    let currentUser: any = null;

    onMount(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                fetchWeights();
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
            await addDoc(collection(db, "weights"), {
                weight,
                timestamp: new Date(),
                userId: currentUser.uid,
            });
            weight = 0;
            fetchWeights();
        }
    }

    async function fetchWeights() {
        if (!currentUser) return;

        const q = query(
            collection(db, "weights"),
            where("userId", "==", currentUser.uid),
            orderBy("timestamp", "asc"),
        );
        const querySnapshot = await getDocs(q);
        weights = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return { weight: data.weight, timestamp: data.timestamp };
        });
        console.log("Fetched weights:", weights); // Debugging line
        drawChart();
    }

    function drawChart() {
        const canvas = document.getElementById(
            "weightChart",
        ) as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                if (chartInstance) {
                    chartInstance.destroy();
                }
                chartInstance = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: weights.map((w) =>
                            new Date(
                                w.timestamp.seconds * 1000,
                            ).toLocaleDateString(),
                        ),
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
            } else {
                console.error("Could not get 2D context for canvas"); // Debugging line
            }
        } else {
            console.error("Canvas element not found"); // Debugging line
        }
    }
</script>

<main class="container">
    <h1>Weight Management</h1>
    <form on:submit|preventDefault={addWeight}>
        <label for="weight">Enter your weight:</label>
        <input type="number" id="weight" bind:value={weight} required />
        <button type="submit">Add Weight</button>
    </form>
    <canvas id="weightChart"></canvas>
</main>

<style>
    .container {
        text-align: center;
        margin: 50px auto;
    }
    form {
        margin-bottom: 20px;
    }
    input {
        margin-right: 10px;
    }
    button {
        padding: 5px 10px;
        background: #4285f4;
        color: white;
        border: none;
        cursor: pointer;
        border-radius: 5px;
        font-size: 14px;
    }
    button:hover {
        background: #357ae8;
    }
</style>
