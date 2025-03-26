<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import { collection, addDoc, serverTimestamp } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { Button, Input, Label, Toggle, Card, Alert, Radio } from "flowbite-svelte";
  import { CheckCircleOutline, ExclamationCircleOutline } from "flowbite-svelte-icons";

  // Form state
  let weight = "";
  let heightCm = "";
  let feet = "";
  let inches = "";
  let useCm = "true";
  let currentUser: { uid: string } | null = null;

  // Loading states
  let weightLoading = false;
  let heightLoading = false;

  // Alert state
  let showAlert = false;
  let alertMessage = "";
  let alertType: "success" | "error" = "success";

  // Input validation
  let weightError = "";
  let heightError = "";

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

  function showMessage(message: string, type: "success" | "error") {
    alertMessage = message;
    alertType = type;
    showAlert = true;
    setTimeout(() => (showAlert = false), 5000);
  }

  function validateWeight(): boolean {
    const parsedWeight = parseFloat(weight);
    if (!weight) {
      weightError = "Weight is required";
      return false;
    }
    if (isNaN(parsedWeight)) {
      weightError = "Please enter a valid number";
      return false;
    }
    if (parsedWeight <= 0) {
      weightError = "Weight must be positive";
      return false;
    }
    if (parsedWeight > 300) {
      weightError = "Weight seems unusually high";
      return false;
    }
    weightError = "";
    return true;
  }

  function validateHeight(): boolean {
    if (useCm === "true") {
      const parsedHeight = parseFloat(heightCm);
      if (!heightCm) {
        heightError = "Height is required";
        return false;
      }
      if (isNaN(parsedHeight)) {
        heightError = "Please enter a valid number";
        return false;
      }
      if (parsedHeight <= 0) {
        heightError = "Height must be positive";
        return false;
      }
      if (parsedHeight > 300) {
        heightError = "Height seems unusually tall";
        return false;
      }
    } else {
      const parsedFeet = parseFloat(feet);
      const parsedInches = parseFloat(inches);
      
      if (!feet && !inches) {
        heightError = "Height is required";
        return false;
      }
      if ((feet && isNaN(parsedFeet)) || (inches && isNaN(parsedInches))) {
        heightError = "Please enter valid numbers";
        return false;
      }
      if (parsedFeet < 0 || parsedInches < 0) {
        heightError = "Values must be positive";
        return false;
      }
      if (parsedInches >= 12) {
        heightError = "Inches must be less than 12";
        return false;
      }
      if (parsedFeet > 8) {
        heightError = "Height seems unusually tall";
        return false;
      }
    }
    heightError = "";
    return true;
  }

  async function addWeight() {
    if (!currentUser) return;
    if (!validateWeight()) return;

    weightLoading = true;
    try {
      await addDoc(collection(db, "weights"), {
        weight: parseFloat(weight),
        timestamp: serverTimestamp(),
        userId: currentUser.uid,
      });
      weight = "";
      showMessage("Weight recorded successfully!", "success");
    } catch (error) {
      console.error("Error adding weight: ", error);
      showMessage("Failed to record weight. Please try again.", "error");
    } finally {
      weightLoading = false;
    }
  }

  async function addHeight() {
    if (!currentUser) return;
    if (!validateHeight()) return;

    heightLoading = true;
    let heightInCm: number;

    try {
      if (useCm === "false") {
        const parsedFeet = parseFloat(feet || "0");
        const parsedInches = parseFloat(inches || "0");
        heightInCm = parsedFeet * 30.48 + parsedInches * 2.54;
      } else {
        heightInCm = parseFloat(heightCm);
      }

      await addDoc(collection(db, "heights"), {
        height: heightInCm,
        timestamp: serverTimestamp(),
        userId: currentUser.uid,
      });
      
      heightCm = "";
      feet = "";
      inches = "";
      showMessage("Height recorded successfully!", "success");
    } catch (error) {
      console.error("Error adding height: ", error);
      showMessage("Failed to record height. Please try again.", "error");
    } finally {
      heightLoading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex items-start justify-center pt-[5vh] md:pt-[10vh] px-4">
  <Card class="w-full max-w-md shadow-lg">
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
      Track Your Measurements
    </h2>

    <!-- Weight Input Section -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <Label for="weight" class="block font-medium">Weight (kg)</Label>
        {#if weightError}
          <span class="text-red-600 text-sm">{weightError}</span>
        {/if}
      </div>
      <Input
        id="weight"
        type="number"
        placeholder="e.g., 70.5"
        bind:value={weight}
        min="1"
        step="0.1"
        class={weightError ? "border-red-500 focus:ring-red-500" : ""}
        on:blur={validateWeight}
      />
      <Button
        color="blue"
        class="w-full mt-3"
        on:click={addWeight}
        disabled={weightLoading || !weight}
      >
        {weightLoading ? "Recording..." : "Record Weight"}
      </Button>
    </div>

    <div class="border-t border-gray-200 my-6"></div>

    <!-- Height Input Section -->
    <div>
      <h3 class="text-lg font-semibold mb-4 text-gray-700">Height Measurement</h3>
      
      <!-- Unit Toggle -->
      <div class="flex justify-center mb-4 space-x-4">
        <Radio
          color="blue"
          name="height-type"
          value="true"
          bind:group={useCm}
        >
          <span class="text-gray-700">Centimeters</span>
        </Radio>
        <Radio
          color="blue"
          name="height-type"
          value="false"
          bind:group={useCm}
        >
          <span class="text-gray-700">Feet & Inches</span>
        </Radio>
      </div>

      <!-- Height Input Fields -->
      {#if useCm === "true"}
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <Label for="heightCm" class="block font-medium">Height (cm)</Label>
            {#if heightError}
              <span class="text-red-600 text-sm">{heightError}</span>
            {/if}
          </div>
          <Input
            id="heightCm"
            type="number"
            placeholder="e.g., 175.2"
            bind:value={heightCm}
            min="1"
            step="0.1"
            class={heightError ? "border-red-500 focus:ring-red-500" : ""}
            on:blur={validateHeight}
          />
        </div>
      {:else}
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <Label class="block font-medium">Height</Label>
            {#if heightError}
              <span class="text-red-600 text-sm">{heightError}</span>
            {/if}
          </div>
          <div class="flex space-x-4">
            <div class="flex-1">
              <Input
                id="feet"
                type="number"
                placeholder="Feet"
                bind:value={feet}
                min="0"
                class={heightError ? "border-red-500 focus:ring-red-500" : ""}
                on:blur={validateHeight}
              />
            </div>
            <div class="flex-1">
              <Input
                id="inches"
                type="number"
                placeholder="Inches"
                bind:value={inches}
                min="0"
                max="11"
                class={heightError ? "border-red-500 focus:ring-red-500" : ""}
                on:blur={validateHeight}
              />
            </div>
          </div>
        </div>
      {/if}

      <Button
        color="blue"
        class="w-full"
        on:click={addHeight}
        disabled={heightLoading || (!heightCm && !feet && !inches)}
      >
        {heightLoading ? "Recording..." : "Record Height"}
      </Button>
    </div>

    <!-- Alert Notification -->
    {#if showAlert}
      <div class="mt-6 animate-fade-in">
        <Alert
          color={alertType === "success" ? "green" : "red"}
          class="shadow-lg"
        >
          <svelte:fragment slot="icon">
            {#if alertType === "success"}
              <CheckCircleOutline class="w-5 h-5" />
            {:else}
              <ExclamationCircleOutline class="w-5 h-5" />
            {/if}
          </svelte:fragment>
          <span class="font-medium">{alertMessage}</span>
        </Alert>
      </div>
    {/if}
  </Card>
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>