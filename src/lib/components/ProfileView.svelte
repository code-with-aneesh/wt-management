<script lang="ts">
  import { tick, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { db } from "$lib/firebase";
  import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
  } from "firebase/firestore";
  import { formatWeight, weightUnit } from "$lib/stores/weightUnit";
  import { get } from "svelte/store";
  import type { Chart } from "chart.js";

  export let uid: string;

  type Profile = {
    name: string;
    photoURL: string;
    joinedAt: Date | null;
  };

  type Stats = {
    currentWeight: number | null;
    weightChange: number | null;
    bmi: number | null;
    totalGymDays: number;
    currentStreak: number;
    attendance: number;
  };

  const emptyStats = (): Stats => ({
    currentWeight: null,
    weightChange: null,
    bmi: null,
    totalGymDays: 0,
    currentStreak: 0,
    attendance: 0,
  });

  type WeightEntry = { weight: number; timestamp: Date };
  type WeightRange = "1w" | "1m" | "3m" | "6m" | "1y" | "all";
  type GymDay = {
    key: string;
    date: Date;
    status: "green" | "red" | "none";
    isFuture: boolean;
  };

  const weightRanges: { key: WeightRange; label: string; days: number | null }[] = [
    { key: "1w", label: "1W", days: 7 },
    { key: "1m", label: "1M", days: 30 },
    { key: "3m", label: "3M", days: 90 },
    { key: "6m", label: "6M", days: 182 },
    { key: "1y", label: "1Y", days: 365 },
    { key: "all", label: "All", days: null },
  ];

  let loading = true;
  let notFound = false;
  let error = "";
  let profile: Profile | null = null;
  let stats: Stats = emptyStats();
  let shareMessage = "";
  let loadedUid = "";

  let weightEntries: WeightEntry[] = [];
  let weightRange: WeightRange = "all";
  let weightCanvas: HTMLCanvasElement;
  let weightChart: Chart | null = null;
  let chartDrawToken = 0;

  let gymDates: Record<string, string> = {};

  $: if (browser && uid && uid !== loadedUid) {
    loadedUid = uid;
    loadProfile(uid);
  }

  $: filteredWeightEntries = getFilteredWeights(weightEntries, weightRange);
  $: gymWeeks = buildGymWeeks(gymDates);
  $: recentGymDays = gymWeeks
    .flat()
    .filter((day) => !day.isFuture && day.status === "green").length;

  const unsubscribeWeightUnit = weightUnit.subscribe(() => {
    if (weightChart) drawWeightChart();
  });

  onDestroy(() => {
    unsubscribeWeightUnit();
    chartDrawToken++;
    weightChart?.destroy();
    weightChart = null;
  });

  async function loadProfile(profileId: string) {
    loading = true;
    notFound = false;
    error = "";
    profile = null;
    stats = emptyStats();
    weightEntries = [];
    gymDates = {};

    try {
      const userSnap = await getDoc(doc(db, "users", profileId));
      if (!userSnap.exists()) {
        notFound = true;
        return;
      }

      const userData = userSnap.data();
      profile = {
        name: userData.name || userData.displayName || "Anonymous",
        photoURL:
          typeof userData.photoURL === "string" ? userData.photoURL : "",
        joinedAt: toDate(userData.createdAt),
      };

      const [weightsResult, heightsResult, calendarResult] =
        await Promise.allSettled([
          getDocs(query(collection(db, "weights"), where("userId", "==", profileId))),
          getDocs(query(collection(db, "heights"), where("userId", "==", profileId))),
          getDoc(doc(db, "calendars", profileId)),
        ]);

      const nextStats = emptyStats();

      if (weightsResult.status === "fulfilled" && !weightsResult.value.empty) {
        const weights = weightsResult.value.docs
          .map((weightDoc) => ({
            weight: Number(weightDoc.data().weight),
            timestamp: toDate(weightDoc.data().timestamp) ?? new Date(0),
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        if (weights.length > 0) {
          const first = weights[0].weight;
          const latest = weights[weights.length - 1].weight;
          nextStats.currentWeight = latest;
          nextStats.weightChange = first - latest;
          weightEntries = weights;
        }
      }

      let latestHeight: number | null = null;
      if (heightsResult.status === "fulfilled" && !heightsResult.value.empty) {
        const heights = heightsResult.value.docs
          .map((heightDoc) => ({
            height: Number(heightDoc.data().height),
            timestamp: toDate(heightDoc.data().timestamp) ?? new Date(0),
          }))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        latestHeight = heights[0]?.height || null;
      }

      if (nextStats.currentWeight && latestHeight) {
        nextStats.bmi = Number(
          (nextStats.currentWeight / Math.pow(latestHeight / 100, 2)).toFixed(1)
        );
      }

      if (calendarResult.status === "fulfilled" && calendarResult.value.exists()) {
        const dates = (calendarResult.value.data().dates || {}) as Record<
          string,
          string
        >;
        gymDates = dates;
        const trackedDays = Object.keys(dates).length;
        const gymDays = Object.values(dates).filter(
          (status) => status === "green"
        ).length;
        nextStats.totalGymDays = gymDays;
        nextStats.currentStreak = calculateStreak(dates);
        nextStats.attendance =
          trackedDays > 0
            ? Number(((gymDays / trackedDays) * 100).toFixed(1))
            : 0;
      }

      stats = nextStats;
    } catch (err) {
      console.error("Failed to load public profile:", err);
      error = "Unable to load this profile right now.";
    } finally {
      loading = false;
      if (profile) {
        await tick();
        drawWeightChart();
      }
    }
  }

  function toDate(value: unknown): Date | null {
    if (value && typeof value === "object" && "toDate" in value) {
      const timestamp = value as { toDate?: () => Date };
      if (typeof timestamp.toDate === "function") return timestamp.toDate();
    }
    if (value instanceof Date) return value;
    return null;
  }

  function getFilteredWeights(
    entries: WeightEntry[],
    range: WeightRange
  ): WeightEntry[] {
    const config = weightRanges.find((item) => item.key === range);
    if (!config?.days) return entries;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (config.days - 1));
    cutoff.setHours(0, 0, 0, 0);
    return entries.filter((entry) => entry.timestamp >= cutoff);
  }

  function setWeightRange(range: WeightRange) {
    if (weightRange === range) return;
    weightRange = range;
    drawWeightChart();
  }

  async function drawWeightChart() {
    if (!browser || !weightCanvas) return;

    const entries = getFilteredWeights(weightEntries, weightRange);
    const token = ++chartDrawToken;
    weightChart?.destroy();
    weightChart = null;

    if (entries.length === 0) return;

    const unit = get(weightUnit);
    const { default: ChartJS } = await import("chart.js/auto");
    if (token !== chartDrawToken || !weightCanvas) return;

    weightChart = new ChartJS(weightCanvas, {
      type: "line",
      data: {
        labels: entries.map((entry) => entry.timestamp.toLocaleDateString()),
        datasets: [
          {
            label: `Weight (${unit})`,
            data: entries.map((entry) =>
              unit === "lbs" ? entry.weight * 2.2046226218 : entry.weight
            ),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(147, 197, 253, 0.35)",
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
            },
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              callback: (value) => `${value}`,
            },
          },
        },
      },
    });
  }

  const GYM_WEEKS = 12;

  function buildGymWeeks(dates: Record<string, string>): GymDay[][] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(
      start.getDate() - (GYM_WEEKS - 1) * 7 - today.getDay()
    );

    const days: GymDay[] = [];
    for (let i = 0; i < GYM_WEEKS * 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = formatLocalDate(date);
      const isFuture = date.getTime() > today.getTime();
      const value = dates[key];
      const status =
        value === "green" || value === "red" ? value : "none";

      days.push({ key, date, status: isFuture ? "none" : status, isFuture });
    }

    const weeks: GymDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }

  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getGymDayClass(day: GymDay): string {
    if (day.isFuture) return "bg-gray-100 dark:bg-gray-700/40";
    if (day.status === "green") return "bg-emerald-500";
    if (day.status === "red") return "bg-red-400";
    return "bg-gray-200 dark:bg-gray-700";
  }

  function getGymDayTitle(day: GymDay): string {
    const formatted = day.date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (day.isFuture) return `${formatted}: upcoming`;
    if (day.status === "green") return `${formatted}: gym day`;
    if (day.status === "red") return `${formatted}: missed`;
    return `${formatted}: not tracked`;
  }

  function calculateStreak(dates: Record<string, string>): number {
    const sortedDates = Object.keys(dates).sort();
    let streak = 0;
    let currentDate = new Date();

    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const dateStr = sortedDates[i];
      const date = new Date(dateStr);

      if (
        date.toDateString() === currentDate.toDateString() &&
        dates[dateStr] === "green"
      ) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  function getBMICategory(bmi: number): string {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function formatJoined(date: Date | null): string {
    if (!date) return "Unknown";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    });
  }

  async function shareProfile() {
    shareMessage = "";
    const url = `${window.location.origin}/profile/${uid}`;

    try {
      await navigator.clipboard.writeText(url);
      shareMessage = "Profile link copied!";
    } catch (err) {
      console.error("Failed to copy profile link:", err);
      shareMessage = "Could not copy the link. You can copy it from the address bar.";
    }

    setTimeout(() => (shareMessage = ""), 4000);
  }
</script>

<svelte:head>
  {#if profile}
    <title>{profile.name} | WtManagement</title>
    <meta
      name="description"
      content={`View ${profile.name}'s public health and fitness profile.`}
    />
  {/if}
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
  <div class="mx-auto max-w-4xl">
    {#if loading}
      <div class="flex h-64 items-center justify-center">
        <div
          class="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"
        ></div>
      </div>
    {:else if notFound}
      <div
        class="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Profile not found
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This user does not exist or has not set up a profile yet.
        </p>
      </div>
    {:else if error}
      <div
        class="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-red-900/20"
      >
        <h1 class="text-xl font-semibold text-red-700 dark:text-red-300">
          Something went wrong
        </h1>
        <p class="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    {:else if profile}
      <div
        class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8"
      >
        <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {#if profile.photoURL}
            <img
              src={profile.photoURL}
              alt={profile.name}
              class="h-24 w-24 rounded-full border-4 border-blue-100 object-cover dark:border-blue-900/50"
            />
          {:else}
            <div
              class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-600 text-2xl font-bold text-white dark:border-blue-900/50"
            >
              {getInitials(profile.name)}
            </div>
          {/if}

          <div class="flex-1 text-center sm:text-left">
            <div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.name}
              </h1>
              <span
                class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              >
                Public profile
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Member since {formatJoined(profile.joinedAt)}
            </p>
            <button
              type="button"
              onclick={shareProfile}
              class="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8.684 13.342a3 3 0 100-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share profile
            </button>
            {#if shareMessage}
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400" role="status">
                {shareMessage}
              </p>
            {/if}
          </div>
        </div>
      </div>

      <div
        class="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Weight Progress
          </h2>
          <div
            class="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-700"
          >
            {#each weightRanges as range (range.key)}
              <button
                type="button"
                onclick={() => setWeightRange(range.key)}
                aria-pressed={weightRange === range.key}
                class={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 ${
                  weightRange === range.key
                    ? "bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400"
                    : "text-gray-600 hover:bg-white/60 dark:text-gray-300 dark:hover:bg-gray-800/30"
                }`}
              >
                {range.label}
              </button>
            {/each}
          </div>
        </div>
        <div class="relative h-56 sm:h-64">
          <canvas bind:this={weightCanvas}></canvas>
          {#if filteredWeightEntries.length === 0}
            <div
              class="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <p class="text-sm text-gray-500 dark:text-gray-400">
                No weight entries in this period.
              </p>
            </div>
          {/if}
        </div>
      </div>

      <div
        class="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Gym Activity
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last 12 weeks · {recentGymDays} gym
              {recentGymDays === 1 ? "day" : "days"}
            </p>
          </div>
          <div
            class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="h-3 w-3 rounded-sm bg-emerald-500"></span>
              Attended
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-3 w-3 rounded-sm bg-red-400"></span>
              Missed
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-3 w-3 rounded-sm bg-gray-200 dark:bg-gray-700"></span>
              Not tracked
            </span>
          </div>
        </div>

        <div class="mt-4 overflow-x-auto">
          <div class="grid min-w-max grid-flow-col grid-rows-7 gap-1">
            {#each gymWeeks as week, weekIndex (weekIndex)}
              {#each week as day (day.key)}
                <div
                  class={`h-3.5 w-3.5 rounded-sm ${getGymDayClass(day)}`}
                  title={getGymDayTitle(day)}
                  role="img"
                  aria-label={getGymDayTitle(day)}
                ></div>
              {/each}
            {/each}
          </div>
        </div>

        <div
          class="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
        >
          <span>
            {gymWeeks[0]?.[0]?.date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>Today</span>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Current Weight
          </p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.currentWeight !== null
              ? `${formatWeight(stats.currentWeight, $weightUnit)} ${$weightUnit}`
              : "N/A"}
          </p>
        </div>

        <div
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Change
          </p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {#if stats.weightChange !== null}
              {#if stats.weightChange > 0}
                ↓ {formatWeight(stats.weightChange, $weightUnit)} {$weightUnit}
              {:else if stats.weightChange < 0}
                ↑ {formatWeight(Math.abs(stats.weightChange), $weightUnit)} {$weightUnit}
              {:else}
                0 {$weightUnit}
              {/if}
            {:else}
              N/A
            {/if}
          </p>
        </div>

        <div
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">BMI</p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.bmi !== null ? stats.bmi : "N/A"}
            {#if stats.bmi !== null}
              <span class="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {getBMICategory(stats.bmi)}
              </span>
            {/if}
          </p>
        </div>

        <div
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Gym Days
          </p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalGymDays}
          </p>
        </div>

        <div
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Current Streak
          </p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.currentStreak} days
          </p>
        </div>

        <div
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Gym Attendance
          </p>
          <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.attendance}%
          </p>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        This is a public profile. Private health details such as age, gender, and
        waist measurements are not shown.
      </p>
    {/if}
  </div>
</div>
