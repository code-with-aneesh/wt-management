<script lang="ts">
  import { onMount } from "svelte";
  import { DarkMode } from 'flowbite-svelte';
  import { db, auth } from "$lib/firebase";
  import {
    collection,
    addDoc,
    setDoc,
    doc,
    serverTimestamp,
  } from "firebase/firestore";
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
    Select,
  } from "flowbite-svelte";
  import {
    CheckCircleOutline,
    ExclamationCircleOutline,
  } from "flowbite-svelte-icons";

  // Form state
  let weight = "";
  let heightCm = "";
  let feet = "";
  let inches = "";
  let useCm = "true";
  let age = "";
  let gender = "";
  let waist = "";
  let activityLevel = "";
  let currentUser: { uid: string } | null = null;

  // Loading states
  let weightLoading = false;
  let heightLoading = false;
  let profileLoading = false;

  // Alert state
  let showAlert = false;
  let alertMessage = "";
  let alertType: "success" | "error" = "success";

  // Input validation
  let weightError = "";
  let heightError = "";
  let ageError = "";
  let waistError = "";
  let profileError = "";

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

  // Validation functions
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
    weightError = "";
    return true;
  }

  function validateAge(): boolean {
    const parsedAge = parseInt(age);
    if (!age) {
      ageError = "Age is required";
      return false;
    }
    if (isNaN(parsedAge)) {
      ageError = "Please enter a valid number";
      return false;
    }
    if (parsedAge < 18 || parsedAge > 120) {
      ageError = "Age must be between 18-120";
      return false;
    }
    ageError = "";
    return true;
  }

  function validateWaist(): boolean {
    const parsedWaist = parseFloat(waist);
    if (!waist) {
      waistError = "Waist circumference is required";
      return false;
    }
    if (isNaN(parsedWaist)) {
      waistError = "Please enter a valid number";
      return false;
    }
    if (parsedWaist <= 0) {
      waistError = "Measurement must be positive";
      return false;
    }
    waistError = "";
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

  // Existing height validation remains the same

  async function addProfile() {
    if (!currentUser) {
      profileError = "User not authenticated";
      return;
    }

    // Validate individual fields first
    const ageValid = validateAge();
    const waistValid = validateWaist();
    const genderValid = !!gender;
    const activityValid = !!activityLevel;

    if (!ageValid || !waistValid || !genderValid || !activityValid) {
      profileError = "Please fill all required fields correctly";
      return;
    }

    profileLoading = true;
    try {
      await setDoc(
        doc(db, "profiles", currentUser.uid),
        {
          userId: currentUser.uid,  // Explicitly store user ID
          age: parseInt(age),
          gender,
          waist: parseFloat(waist),
          activityLevel,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      // Clear errors on success
      ageError = "";
      waistError = "";
      profileError = "";
      showMessage("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Error updating profile: ", error);
      profileError = "Failed to save profile. Please try again.";
      showMessage("Failed to update profile. Please try again.", "error");
    } finally {
      profileLoading = false;
    }
  }
  // Existing addWeight and addHeight functions remain the same
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-start justify-center pt-[5vh] md:pt-[10vh] px-4">
  <Card class="w-full max-w-2xl shadow-xl rounded-2xl dark:bg-gray-800 dark:border-gray-700">
    <!-- Header Section with Dark Mode Toggle -->
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Health Metrics Tracker
      </h2>
      
    </div>

    <div class="grid md:grid-cols-2 gap-8">
      <!-- Left Column -->
      <div class="space-y-6">
        <!-- Weight Section -->
        <div class="animate-slide-in">
          <div class="flex justify-between items-center mb-2">
            <Label class="text-lg font-semibold dark:text-gray-300">Weight (kg)</Label>
            {#if weightError}
              <span class="text-red-600 dark:text-red-500 text-sm">{weightError}</span>
            {/if}
          </div>
          <Input
            type="number"
            bind:value={weight}
            placeholder="72.5"
            min="1"
            step="0.1"
            class="rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            on:blur={validateWeight}
          />
          <Button
            color="blue"
            class="w-full mt-3 transform transition hover:scale-[1.02] dark:enabled:hover:bg-blue-700"
            on:click={addWeight}
            disabled={weightLoading || !weight}
          >
            {weightLoading ? "Saving..." : "Save Weight"}
          </Button>
        </div>

        <!-- Height Section -->
        <div class="animate-slide-in delay-100">
          <div class="flex justify-between items-center mb-2">
            <Label class="text-lg font-semibold dark:text-gray-300">Height</Label>
            {#if heightError}
              <span class="text-red-600 dark:text-red-500 text-sm">{heightError}</span>
            {/if}
          </div>
          <div class="space-y-4">
            <div class="flex gap-4">
              <Radio
                name="height-unit"
                value="true"
                bind:group={useCm}
                color="blue"
                class="flex items-center gap-2 dark:text-gray-300"
              >
                Centimeters
              </Radio>
              <Radio
                name="height-unit"
                value="false"
                bind:group={useCm}
                color="blue"
                class="flex items-center gap-2 dark:text-gray-300"
              >
                Feet & Inches
              </Radio>
            </div>
            {#if useCm === "true"}
              <Input
                type="number"
                bind:value={heightCm}
                placeholder="175"
                min="1"
                class="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                on:blur={validateHeight}
              />
            {:else}
              <div class="flex gap-4">
                <Input
                  type="number"
                  bind:value={feet}
                  placeholder="Feet"
                  min="0"
                  class="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  on:blur={validateHeight}
                />
                <Input
                  type="number"
                  bind:value={inches}
                  placeholder="Inches"
                  min="0"
                  max="11"
                  class="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  on:blur={validateHeight}
                />
              </div>
            {/if}
            <Button
              color="blue"
              class="w-full transform transition hover:scale-[1.02] dark:enabled:hover:bg-blue-700"
              on:click={addHeight}
              disabled={heightLoading || (!heightCm && !feet && !inches)}
            >
              {heightLoading ? "Saving..." : "Save Height"}
            </Button>
          </div>
        </div>
      </div>

      <!-- Right Column - Personal Details -->
      <div class="animate-slide-in delay-200">
        <h3 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white">
          Personal Details
        </h3>
        <div class="space-y-5">
          <div>
            <Label class="block mb-2 dark:text-gray-300">Age</Label>
            <Input
              type="number"
              bind:value={age}
              placeholder="28"
              min="18"
              max="120"
              class="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              on:blur={validateAge}
            />
            {#if ageError}
              <p class="text-red-600 dark:text-red-500 text-sm mt-1">{ageError}</p>
            {/if}
          </div>

          <div>
            <Label class="block mb-2 dark:text-gray-300">Gender</Label>
            <div class="flex gap-4">
              <Radio
                name="gender"
                value="male"
                bind:group={gender}
                color="blue"
                class="dark:text-gray-300"
              >
                Male
              </Radio>
              <Radio
                name="gender"
                value="female"
                bind:group={gender}
                color="blue"
                class="dark:text-gray-300"
              >
                Female
              </Radio>
              <Radio
                name="gender"
                value="other"
                bind:group={gender}
                color="blue"
                class="dark:text-gray-300"
              >
                Other
              </Radio>
            </div>
          </div>

          <div>
            <Label class="block mb-2 dark:text-gray-300">Waist Circumference (cm)</Label>
            <Input
              type="number"
              bind:value={waist}
              placeholder="86.5"
              step="0.1"
              class="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              on:blur={validateWaist}
            />
            {#if waistError}
              <p class="text-red-600 dark:text-red-500 text-sm mt-1">{waistError}</p>
            {/if}
          </div>

          <div>
            <Label class="block mb-2 dark:text-gray-300">Activity Level</Label>
            <Select
              bind:value={activityLevel}
              class="rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="" class="dark:bg-gray-700">Select activity level</option>
              <option value="sedentary" class="dark:bg-gray-700">Sedentary (little/no exercise)</option>
              <option value="light" class="dark:bg-gray-700">Lightly Active (light exercise 1-3 days/week)</option>
              <option value="moderate" class="dark:bg-gray-700">Moderately Active (moderate exercise 3-5 days/week)</option>
              <option value="active" class="dark:bg-gray-700">Very Active (intense exercise 6-7 days/week)</option>
            </Select>
          </div>

          {#if profileError}
            <p class="text-red-600 dark:text-red-500 text-sm">{profileError}</p>
          {/if}

          <Button
            color="green"
            class="w-full mt-4 transform transition hover:scale-[1.02] dark:enabled:hover:bg-green-700"
            on:click={addProfile}
            disabled={profileLoading || !age || !gender || !waist || !activityLevel}
          >
            {profileLoading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </div>

    <!-- Alert Notification -->
    {#if showAlert}
      <div class="mt-6 animate-fade-in">
        <Alert
          color={alertType === "success" ? "green" : "red"}
          class="shadow-lg rounded-lg dark:bg-gray-700 dark:border-gray-600"
        >
          <svelte:fragment slot="icon">
            {#if alertType === "success"}
              <CheckCircleOutline class="w-6 h-6 dark:text-green-400" />
            {:else}
              <ExclamationCircleOutline class="w-6 h-6 dark:text-red-400" />
            {/if}
          </svelte:fragment>
          <span class="font-medium text-lg dark:text-white">{alertMessage}</span>
        </Alert>
      </div>
    {/if}
  </Card>
</div>

<style>
  .animate-slide-in {
    animation: slideIn 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  .delay-100 {
    animation-delay: 0.1s;
  }

  .delay-200 {
    animation-delay: 0.2s;
  }

  @keyframes slideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
