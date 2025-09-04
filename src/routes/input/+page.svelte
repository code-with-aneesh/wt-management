<script lang="ts">
  import { onMount } from "svelte";
  import { DarkMode } from "flowbite-svelte";
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

  // Alert states for each section
  let weightAlert = { show: false, message: "", type: "success" as "success" | "error" };
  let heightAlert = { show: false, message: "", type: "success" as "success" | "error" };
  let profileAlert = { show: false, message: "", type: "success" as "success" | "error" };

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

  function showMessage(section: "weight" | "height" | "profile", message: string, type: "success" | "error") {
    if (section === "weight") {
      weightAlert = { show: true, message, type };
      setTimeout(() => (weightAlert.show = false), 5000);
    } else if (section === "height") {
      heightAlert = { show: true, message, type };
      setTimeout(() => (heightAlert.show = false), 5000);
    } else if (section === "profile") {
      profileAlert = { show: true, message, type };
      setTimeout(() => (profileAlert.show = false), 5000);
    }
  }

  // Validation functions (unchanged)
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
      const parsedFeet = parseFloat(feet || "0");
      const parsedInches = parseFloat(inches || "0");

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
      showMessage("weight", "Weight recorded successfully!", "success");
    } catch (error) {
      console.error("Error adding weight: ", error);
      showMessage("weight", "Failed to record weight. Please try again.", "error");
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
      showMessage("height", "Height recorded successfully!", "success");
    } catch (error) {
      console.error("Error adding height: ", error);
      showMessage("height", "Failed to record height. Please try again.", "error");
    } finally {
      heightLoading = false;
    }
  }

  async function addProfile() {
    if (!currentUser) {
      profileError = "User not authenticated";
      return;
    }

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
          userId: currentUser.uid,
          age: parseInt(age),
          gender,
          waist: parseFloat(waist),
          activityLevel,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      ageError = "";
      waistError = "";
      profileError = "";
      showMessage("profile", "Profile updated successfully!", "success");
    } catch (error) {
      console.error("Error updating profile: ", error);
      profileError = "Failed to save profile. Please try again.";
      showMessage("profile", "Failed to update profile. Please try again.", "error");
    } finally {
      profileLoading = false;
    }
  }
</script>

<div
  class="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-start justify-center pt-6 px-4 sm:pt-10 sm:px-6 lg:px-8"
>
  <div class="w-full max-w-4xl">
    <!-- Header Section -->
    <div class="text-center mb-6 md:mb-8">
      <div class="mx-auto max-w-2xl rounded-xl md:rounded-2xl p-6 md:p-8 mb-4 md:mb-6 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 dark:from-green-700 dark:via-blue-700 dark:to-purple-700 shadow">
        <div class="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-3">
          <span class="text-3xl md:text-4xl">📊</span>
          <h1 class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 drop-shadow">Health Metrics Tracker</h1>
        </div>
        <p class="text-gray-700 dark:text-gray-200 text-base md:text-lg">Track your health journey with precision and ease</p>
      </div>
    </div>

    <Card
      class="w-full shadow-lg rounded-xl dark:bg-gray-800 dark:border-gray-700 p-4 sm:p-6 lg:p-8"
    >
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 class="text-lg md:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-white">
          Health Metrics Tracker
        </h2>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <!-- Left Column -->
        <div class="space-y-6 md:space-y-8">
          <!-- Weight Section -->
          <div class="animate-slide-in bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg border-l-4 border-blue-400 dark:border-blue-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg class="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                </svg>
              </div>
              <div>
                <Label class="text-base md:text-lg lg:text-xl font-semibold dark:text-gray-300">Weight (kg)</Label>
                <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">Track your weight changes over time</p>
              </div>
            </div>
            <div class="mb-3 md:mb-4">
              <Input
                type="number"
                bind:value={weight}
                placeholder="72.5"
                min="1"
                step="0.1"
                class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm md:text-base border-2 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
                on:blur={validateWeight}
              />
              {#if weightError}
                <span class="text-red-600 dark:text-red-500 text-xs md:text-sm mt-2 block">{weightError}</span>
              {/if}
            </div>
            <div class="flex flex-col sm:flex-row gap-2 md:gap-3">
              <Button
                color="blue"
                size="md"
                class="w-full transform transition hover:scale-[1.02] dark:enabled:hover:bg-blue-700 text-sm md:text-base font-medium py-2 md:py-3"
                on:click={addWeight}
                disabled={weightLoading || !weight}
                aria-label="Save weight"
              >
                {weightLoading ? "Saving..." : "Save Weight"}
              </Button>
              <Button
                color="light"
                size="md"
                class="w-full transform transition hover:scale-[1.02] dark:enabled:hover:bg-gray-600 text-sm md:text-base font-medium py-2 md:py-3"
                href="/updateweights"
                disabled={weightLoading}
                aria-label="View weight records"
              >
                View Records
              </Button>
            </div>
            {#if weightAlert.show}
              <div class="mt-3 md:mt-4 animate-fade-in">
                <Alert
                  color={weightAlert.type === "success" ? "green" : "red"}
                  class="shadow-md rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm md:text-base"
                  dismissable
                >
                  <svelte:fragment slot="icon">
                    {#if weightAlert.type === "success"}
                      <CheckCircleOutline class="w-4 h-4 md:w-5 md:h-5 dark:text-green-400" />
                    {:else}
                      <ExclamationCircleOutline class="w-4 h-4 md:w-5 md:h-5 dark:text-red-400" />
                    {/if}
                  </svelte:fragment>
                  <span class="font-medium dark:text-white">{weightAlert.message}</span>
                </Alert>
              </div>
            {/if}
          </div>

          <!-- Height Section -->
          <div class="animate-slide-in delay-100 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg border-l-4 border-green-400 dark:border-green-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg class="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
                </svg>
              </div>
              <div>
                <Label class="text-base md:text-lg lg:text-xl font-semibold dark:text-gray-300">Height</Label>
                <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">Record your height in your preferred unit</p>
              </div>
            </div>
            <div class="space-y-3 md:space-y-4">
              <div class="flex gap-3 md:gap-4 p-2 md:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Radio
                  name="height-unit"
                  value="true"
                  bind:group={useCm}
                  color="blue"
                  class="flex items-center gap-1 md:gap-2 dark:text-gray-300 text-sm md:text-base"
                >
                  Centimeters
                </Radio>
                <Radio
                  name="height-unit"
                  value="false"
                  bind:group={useCm}
                  color="blue"
                  class="flex items-center gap-1 md:gap-2 dark:text-gray-300 text-sm md:text-base"
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
                  class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm md:text-base border-2 focus:border-green-400 dark:focus:border-green-500 transition-colors"
                  on:blur={validateHeight}
                />
              {:else}
                <div class="flex gap-3 md:gap-4">
                  <Input
                    type="number"
                    bind:value={feet}
                    placeholder="Feet"
                    min="0"
                    class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm md:text-base border-2 focus:border-green-400 dark:focus:border-green-500 transition-colors"
                    on:blur={validateHeight}
                  />
                  <Input
                    type="number"
                    bind:value={inches}
                    placeholder="Inches"
                    min="0"
                    max="11"
                    class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm md:text-base border-2 focus:border-green-400 dark:focus:border-green-500 transition-colors"
                    on:blur={validateHeight}
                  />
                </div>
              {/if}
              {#if heightError}
                <span class="text-red-600 dark:text-red-500 text-xs md:text-sm block">{heightError}</span>
              {/if}
              <Button
                color="green"
                size="md"
                class="w-full transform transition hover:scale-[1.02] dark:enabled:hover:bg-green-700 text-sm md:text-base font-medium py-2 md:py-3"
                on:click={addHeight}
                disabled={heightLoading || (!heightCm && !feet && !inches)}
                aria-label="Save height"
              >
                {heightLoading ? "Saving..." : "Save Height"}
              </Button>
              {#if heightAlert.show}
                <div class="mt-3 md:mt-4 animate-fade-in">
                  <Alert
                    color={heightAlert.type === "success" ? "green" : "red"}
                    class="shadow-md rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm md:text-base"
                    dismissable
                  >
                    <svelte:fragment slot="icon">
                      {#if heightAlert.type === "success"}
                        <CheckCircleOutline class="w-4 h-4 md:w-5 md:h-5 dark:text-green-400" />
                      {:else}
                        <ExclamationCircleOutline class="w-4 h-4 md:w-5 md:h-5 dark:text-red-400" />
                      {/if}
                    </svelte:fragment>
                    <span class="font-medium dark:text-white">{heightAlert.message}</span>
                  </Alert>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Right Column - Personal Details -->
        <div class="animate-slide-in delay-200 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg border-l-4 border-purple-400 dark:border-purple-600 hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700">
          <div class="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <svg class="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div>
              <h3 class="text-lg md:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-white">Personal Details</h3>
              <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400">Complete your health profile for personalized insights</p>
            </div>
          </div>
          <div class="space-y-4 md:space-y-6">
            <div>
              <Label class="block mb-2 dark:text-gray-300 text-sm md:text-base font-medium">Age</Label>
              <Input
                type="number"
                bind:value={age}
                placeholder="28"
                min="18"
                max="120"
                class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm md:text-base border-2 focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
                on:blur={validateAge}
              />
              {#if ageError}
                <p class="text-red-600 dark:text-red-500 text-xs md:text-sm mt-2">{ageError}</p>
              {/if}
            </div>

            <div>
              <Label class="block mb-2 dark:text-gray-300 text-sm md:text-base font-medium">Gender</Label>
              <div class="flex gap-4 md:gap-6 p-2 md:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Radio
                  name="gender"
                  value="male"
                  bind:group={gender}
                  color="blue"
                  class="dark:text-gray-300 text-sm md:text-base"
                >
                  Male
                </Radio>
                <Radio
                  name="gender"
                  value="female"
                  bind:group={gender}
                  color="blue"
                  class="dark:text-gray-300 text-sm md:text-base"
                >
                  Female
                </Radio>
                <Radio
                  name="gender"
                  value="other"
                  bind:group={gender}
                  color="blue"
                  class="dark:text-gray-300 text-sm md:text-base"
                >
                  Other
                </Radio>
              </div>
            </div>

            <div>
              <Label class="block mb-2 dark:text-gray-300 text-sm md:text-base font-medium">Waist Circumference (cm)</Label>
              <Input
                type="number"
                bind:value={waist}
                placeholder="86.5"
                step="0.1"
                class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm md:text-base border-2 focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
                on:blur={validateWaist}
              />
              {#if waistError}
                <p class="text-red-600 dark:text-red-500 text-xs md:text-sm mt-2">{waistError}</p>
              {/if}
            </div>

            <div>
              <Label class="block mb-2 dark:text-gray-300 text-sm md:text-base font-medium">Activity Level</Label>
              <Select
                bind:value={activityLevel}
                class="rounded-lg h-10 md:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm md:text-base border-2 focus:border-purple-400 dark:focus:border-purple-500 transition-colors"
              >
                <option value="" class="dark:bg-gray-700">Select activity level</option>
                <option value="sedentary" class="dark:bg-gray-700">Sedentary (little/no exercise)</option>
                <option value="light" class="dark:bg-gray-700">Lightly Active (light exercise 1-3 days/week)</option>
                <option value="moderate" class="dark:bg-gray-700">Moderately Active (moderate exercise 3-5 days/week)</option>
                <option value="active" class="dark:bg-gray-700">Very Active (intense exercise 6-7 days/week)</option>
              </Select>
            </div>

            {#if profileError}
              <p class="text-red-600 dark:text-red-500 text-xs md:text-sm bg-red-50 dark:bg-red-900/20 p-2 md:p-3 rounded-lg">{profileError}</p>
            {/if}

            <Button
              color="purple"
              size="md"
              class="w-full mt-4 transform transition hover:scale-[1.02] dark:enabled:hover:bg-purple-700 text-sm md:text-base font-medium py-2 md:py-3"
              on:click={addProfile}
              disabled={profileLoading || !age || !gender || !waist || !activityLevel}
              aria-label="Save profile"
            >
              {profileLoading ? "Saving..." : "Save Profile"}
            </Button>
            {#if profileAlert.show}
              <div class="mt-3 md:mt-4 animate-fade-in">
                <Alert
                  color={profileAlert.type === "success" ? "green" : "red"}
                  class="shadow-md rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm md:text-base"
                  dismissable
                >
                  <svelte:fragment slot="icon">
                    {#if profileAlert.type === "success"}
                      <CheckCircleOutline class="w-4 h-4 md:w-5 md:h-5 dark:text-green-400" />
                    {:else}
                      <ExclamationCircleOutline class="w-4 h-4 md:w-5 md:h-5 dark:text-red-400" />
                    {/if}
                  </svelte:fragment>
                  <span class="font-medium dark:text-white">{profileAlert.message}</span>
                </Alert>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </Card>
  </div>
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