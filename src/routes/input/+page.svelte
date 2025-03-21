<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import {
    collection,
    addDoc,
    serverTimestamp,
  } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { Popover } from "flowbite-svelte";

  let weight = "";
  let heightCm = "";
  let feet = "";
  let inches = "";
  let useCm = true;
  let currentUser: { uid: string } | null = null;

  // Popover state
  let showPopover = false;
  let popoverMessage = "";
  let popoverType: "success" | "error" = "success";

  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
      } else {
        currentUser = null;
        goto("/");
      }
    });
  });

  // Function to show Popover
  function showMessage(message: string, type: "success" | "error") {
    popoverMessage = message;
    popoverType = type;
    showPopover = true;
    setTimeout(() => (showPopover = false), 3000); // Hide after 3 seconds
  }

  async function addWeight() {
    if (!currentUser || !weight) {
      showMessage("Please enter a valid weight.", "error");
      return;
    }

    try {
      await addDoc(collection(db, "weights"), {
        weight: parseFloat(weight),
        timestamp: serverTimestamp(),
        userId: currentUser.uid,
      });
      weight = "";
      showMessage("Weight added successfully!", "success");
    } catch (error) {
      console.error("Error adding weight: ", error);
      showMessage("Failed to add weight.", "error");
    }
  }

  async function addHeight() {
    if (!currentUser) return;

    if (!useCm && (feet === "" || inches === "")) {
      showMessage("Please enter both feet and inches.", "error");
      return;
    }

    if (useCm && heightCm === "") {
      showMessage("Please enter height in centimeters.", "error");
      return;
    }

    const heightInCm = useCm
      ? parseFloat(heightCm)
      : parseFloat(feet) * 30.48 + parseFloat(inches) * 2.54;

    try {
      await addDoc(collection(db, "heights"), {
        height: heightInCm,
        timestamp: serverTimestamp(),
        userId: currentUser.uid,
      });
      heightCm = "";
      feet = "";
      inches = "";
      showMessage("Height added successfully!", "success");
    } catch (error) {
      console.error("Error adding height: ", error);
      showMessage("Failed to add height.", "error");
    }
  }
</script>

<main class="input-container">
  <h2>Enter Your Measurements</h2>

  <!-- Weight Input -->
  <div class="input-group">
    <label for="weight">Weight (kg):</label>
    <input id="weight" type="number" bind:value={weight} placeholder="e.g., 70" />
    <button on:click={addWeight} class="btn-primary">Add Weight</button>
  </div>

  <!-- Height Input Toggle -->
  <div class="toggle-group">
    <label class="toggle-label">
      <input type="radio" bind:group={useCm} value={true} />
      <span>Enter in cm</span>
    </label>
    <label class="toggle-label">
      <input type="radio" bind:group={useCm} value={false} />
      <span>Enter in ft/inches</span>
    </label>
  </div>

  <!-- Height Input -->
  {#if useCm}
    <div class="input-group">
      <label for="heightCm">Height (cm):</label>
      <input id="heightCm" type="number" bind:value={heightCm} placeholder="e.g., 175" />
    </div>
  {:else}
    <div class="input-group">
      <label for="feet">Feet:</label>
      <input id="feet" type="number" bind:value={feet} placeholder="e.g., 5" />
    </div>
    <div class="input-group">
      <label for="inches">Inches:</label>
      <input id="inches" type="number" bind:value={inches} placeholder="e.g., 9" />
    </div>
  {/if}

  <button on:click={addHeight} class="btn-primary">Add Height</button>

  <!-- Popover for Messages -->
  {#if showPopover}
    <Popover
      class="fixed bottom-4 right-4"
      color={popoverType === "success" ? "green" : "red"}
    >
      {popoverMessage}
    </Popover>
  {/if}
</main>

<style>
  :global(body) {
    font-family: 'Arial', sans-serif;
    background-color: #f4f4f9;
    margin: 0;
    padding: 0;
  }

  .input-container {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  h2 {
    margin-bottom: 1.5rem;
    color: #333;
  }

  .input-group {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  .input-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
  }

  .input-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
  }

  .toggle-group {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    color: #555;
  }

  .toggle-label input {
    margin: 0;
  }

  .btn-primary {
    width: 100%;
    padding: 0.75rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .btn-primary:hover {
    background-color: #0056b3;
  }

  @media (max-width: 480px) {
    .input-container {
      padding: 1rem;
    }

    .toggle-group {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>