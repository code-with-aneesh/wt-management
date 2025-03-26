<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import { collection, addDoc, serverTimestamp } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import {
    Button,
    Input,
    Label,
    Toggle,
    Card,
    Alert,
    Radio,
  } from "flowbite-svelte";
  import { CheckCircleOutline, CirclePlusOutline } from "flowbite-svelte-icons";

  let weight = "";
  let heightCm = "";
  let feet = "";
  let inches = "";
  let useCm = "true";
  let currentUser: { uid: string } | null = null;

  // Alert state
  let showAlert = false;
  let alertMessage = "";
  let alertType: "success" | "error" = "success";

  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
      } else if (useCm === "true") {
        currentUser = null;
        goto("/");
      }
    });
  });

  // Function to show Alert
  function showMessage(message: string, type: "success" | "error") {
    alertMessage = message;
    alertType = type;
    showAlert = true;
    setTimeout(() => (showAlert = false), 3000); // Hide after 3 seconds
  }

  async function addWeight() {
    const parsedWeight = parseFloat(weight);
    if (!currentUser || isNaN(parsedWeight) || parsedWeight <= 0) {
      showMessage("Weight must be a positive number greater than 0.", "error");
      return;
    }

    try {
      await addDoc(collection(db, "weights"), {
        weight: parsedWeight,
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

    let heightInCm: number;

    if (useCm === "false") {
      const parsedFeet = parseFloat(feet);
      const parsedInches = parseFloat(inches);

      if (
        isNaN(parsedFeet) ||
        parsedFeet < 0 ||
        isNaN(parsedInches) ||
        parsedInches < 0
      ) {
        showMessage("Feet and inches must be non-negative numbers.", "error");
        return;
      }

      heightInCm = parsedFeet * 30.48 + parsedInches * 2.54;
    } else {
      heightInCm = parseFloat(heightCm);
      if (isNaN(heightInCm) || heightInCm <= 0) {
        showMessage(
          "Height must be a positive number greater than 0.",
          "error"
        );
        return;
      }
    }

    try {
      await addDoc(collection(db, "heights"), {
        height: heightInCm, // Always save in cm
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

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
  <Card class="w-full max-w-md">
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
      Enter Your Measurements
    </h2>

    <!-- Weight Input -->
    <div class="mb-4">
      <Label for="weight" class="block mb-2">Weight (kg)</Label>
      <Input
        id="weight"
        type="number"
        placeholder="e.g., 70"
        bind:value={weight}
        min="1"
      />
      <Button
        color="blue"
        class="w-full mt-3 
          bg-blue-600 
          hover:bg-blue-700 
          focus:ring-4 
          focus:ring-blue-300 
          dark:bg-blue-600 
          dark:hover:bg-blue-700 
          dark:focus:ring-blue-800"
        on:click={addWeight}
      >
        Add Weight
      </Button>
    </div>

    <!-- Height Input Toggle -->
    <div class="flex justify-center mb-4 space-x-4">
      <Radio
        color="blue"
        name="height-type"
        value="true"
        bind:group={useCm}
        class="
          text-black 
          checked:bg-blue-600 
          checked:border-blue-600 
          focus:ring-blue-500 
          dark:bg-gray-700 
          dark:border-gray-600
          hover:border-blue-600"
      >
        <span class="text-black">Enter in cm</span>
      </Radio>
      <Radio
        color="blue"
        name="height-type"
        value="false"
        bind:group={useCm}
        class="
          text-black 
          checked:bg-blue-600 
          checked:border-blue-600 
          focus:ring-blue-500 
          dark:bg-gray-700 
          dark:border-gray-600
          hover:border-blue-600"
      >
        <span class="text-black">Enter in ft/inches</span>
      </Radio>
    </div>

    <!-- Height Input -->
    {#if useCm === "true"}
      <div class="mb-4">
        <Label for="heightCm" class="block mb-2">Height (cm)</Label>
        <Input
          id="heightCm"
          type="number"
          placeholder="e.g., 175"
          bind:value={heightCm}
          min="1"
        />
      </div>
    {:else}
      <div class="flex space-x-4 mb-4">
        <div class="flex-1">
          <Label for="feet" class="block mb-2">Feet</Label>
          <Input
            id="feet"
            type="number"
            placeholder="e.g., 5"
            bind:value={feet}
            min="0"
          />
        </div>
        <div class="flex-1">
          <Label for="inches" class="block mb-2">Inches</Label>
          <Input
            id="inches"
            type="number"
            placeholder="e.g., 9"
            bind:value={inches}
            min="0"
          />
        </div>
      </div>
    {/if}

    <Button
      color="blue"
      class="w-full 
        bg-blue-600 
        hover:bg-blue-700 
        focus:ring-4 
        focus:ring-blue-300 
        dark:bg-blue-600 
        dark:hover:bg-blue-700 
        dark:focus:ring-blue-800"
      on:click={addHeight}
    >
      Add Height
    </Button>

    <!-- Alert for Messages -->
    {#if showAlert}
      <div class="mt-4">
        <Alert
          color={alertType === "success" ? "green" : "red"}
          dismissable={false}
        >
          <svelte:fragment slot="icon">
            {#if alertType === "success"}
              <CheckCircleOutline class="w-5 h-5" />
            {:else}
              <CirclePlusOutline class="w-5 h-5" />
            {/if}
          </svelte:fragment>
          {alertMessage}
        </Alert>
      </div>
    {/if}
  </Card>
</div>
