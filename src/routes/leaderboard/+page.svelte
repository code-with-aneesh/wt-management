<script lang="ts">
    import { onMount } from "svelte";
    import { DarkMode } from "flowbite-svelte";
    import { fade } from "svelte/transition";
    import { browser } from "$app/environment";
    import { db, auth } from "$lib/firebase";
    import {
      collection,
      getDocs,
      query,
      where,
      doc,
      getDoc,
    } from "firebase/firestore";
    import { onAuthStateChanged } from "firebase/auth";
    import { goto } from "$app/navigation";
  
    // Data variables
    let leaderboardData: {
      userId: string;
      username: string;
      weightLoss: number | null;
      totalGymDays: number;
      currentStreak: number;
      attendancePercentage: number;
    }[] = [];
    let currentUser: { uid: string; displayName: string } | null = null;
    let sortKey: keyof (typeof leaderboardData)[0] = "weightLoss";
    let sortDirection: "asc" | "desc" = "desc";
    let isLoading: boolean = true;
  
    // Initialize component
    onMount(() => {
      if (!browser) return;
  
      let cleanup: (() => void) | undefined;
  
      (async () => {
        const fetchLeaderboardData = async () => {
          try {
            isLoading = true;
            // Fetch all users' data
            const usersQuery = query(collection(db, "users"));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.map((doc) => ({
              userId: doc.id,
              username: doc.data().name || "Anonymous",
            }));
  
            const tempLeaderboard: typeof leaderboardData = [];
  
            // Fetch weight and gym data for each user
            for (const user of usersData) {
              // Fetch weights
              const weightsQuery = query(
                collection(db, "weights"),
                where("userId", "==", user.userId)
              );
              const weightsSnapshot = await getDocs(weightsQuery);
              const weights = weightsSnapshot.docs
                .map((doc) => ({
                  weight: doc.data().weight,
                  timestamp: doc.data().timestamp.toDate(),
                }))
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
              // Calculate weight loss (require at least 2 entries)
              const weightLoss =
                weights.length >= 2
                  ? Number(
                      (
                        weights[0].weight - weights[weights.length - 1].weight
                      ).toFixed(1)
                    )
                  : null;
  
              // Fetch gym dates
              const docRef = doc(db, "calendars", user.userId);
              const docSnap = await getDoc(docRef);
              const gymDates = docSnap.exists() ? docSnap.data().dates || {} : {};
  
              // Calculate gym metrics
              const totalGymDays = Object.values(gymDates).filter(
                (status) => status === "green"
              ).length;
              const attendancePercentage =
                Object.keys(gymDates).length > 0
                  ? Number(
                      (
                        (totalGymDays / Object.keys(gymDates).length) *
                        100
                      ).toFixed(1)
                    )
                  : 0;
              const currentStreak = calculateConsecutiveGymDays(gymDates);
  
              // Only include users with sufficient data
              if (weights.length > 0 || Object.keys(gymDates).length > 0) {
                tempLeaderboard.push({
                  userId: user.userId,
                  username: user.username,
                  weightLoss,
                  totalGymDays,
                  currentStreak,
                  attendancePercentage,
                });
              }
            }
  
            // Sort leaderboard
            leaderboardData = tempLeaderboard.sort((a, b) => {
              const aValue = a[sortKey] ?? (sortKey === "weightLoss" ? null : 0);
              const bValue = b[sortKey] ?? (sortKey === "weightLoss" ? null : 0);
              if (aValue === null && bValue === null) return 0;
              if (aValue === null) return sortDirection === "desc" ? 1 : -1;
              if (bValue === null) return sortDirection === "desc" ? -1 : 1;
              return sortDirection === "desc"
                ? Number(bValue) - Number(aValue)
                : Number(aValue) - Number(bValue);
            });
          } finally {
            isLoading = false;
          }
        };
  
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            currentUser = {
              uid: user.uid,
              displayName: user.displayName || "Anonymous",
            };
            fetchLeaderboardData();
          } else {
            currentUser = null;
            goto("/");
          }
        });
  
        cleanup = () => {
          unsubscribe();
        };
      })();
  
      return cleanup;
    });
  
    function calculateConsecutiveGymDays(dates: {
      [key: string]: string;
    }): number {
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
  
    function handleSort(key: keyof (typeof leaderboardData)[0]) {
      if (sortKey === key) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDirection = "desc";
      }
      leaderboardData = [...leaderboardData].sort((a, b) => {
        const aValue = a[sortKey] ?? (sortKey === "weightLoss" ? null : 0);
        const bValue = b[sortKey] ?? (sortKey === "weightLoss" ? null : 0);
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return sortDirection === "desc" ? 1 : -1;
        if (bValue === null) return sortDirection === "desc" ? -1 : 1;
        return sortDirection === "desc"
          ? Number(bValue) - Number(aValue)
          : Number(aValue) - Number(bValue);
      });
    }
  
    function getRankStyle(index: number, user: { userId: string }) {
      if (index === 0)
        return "bg-gradient-to-r from-yellow-300 to-yellow-400 dark:from-yellow-500/30 dark:to-yellow-600/30"; // Gold
      if (index === 1)
        return "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-zinc-600/30 dark:to-zinc-700/30"; // Silver
      if (index === 2)
        return "bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-700/30 dark:to-amber-800/30"; // Bronze
      return user.userId === currentUser?.uid
        ? "bg-blue-100/75 dark:bg-blue-900/20"
        : "bg-gray-50 dark:bg-gray-800";
    }
  
    function getRankIcon(index: number) {
      if (index === 0) return "🏆";
      if (index === 1) return "🥈";
      if (index === 2) return "🥉";
      return "";
    }
</script>

<div
  class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6"
  transition:fade
>
  <div class="max-w-7xl mx-auto">
    <header class="mb-8 flex justify-between items-center">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          Current Leaderboard
        </h1>
      </div>
    </header>

    {#if isLoading}
      <div class="flex justify-center items-center h-64" transition:fade>
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 dark:border-gray-600 border-solid"
        ></div>
      </div>
    {:else if leaderboardData.length === 0}
      <div
        class="text-center text-gray-600 dark:text-gray-400 py-10"
        transition:fade
      >
        <p class="text-xl">
          No data available. Start tracking your progress to join the leaderboard!
        </p>
      </div>
    {:else}
      <!-- Leaderboard Table -->
      <div
        class="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 overflow-x-auto"
      >
        <table
          class="w-full text-sm text-left text-gray-700 dark:text-gray-400"
        >
          <thead
            class="text-xs uppercase bg-gray-200 dark:bg-gray-800 dark:text-gray-500"
          >
            <tr>
              <th scope="col" class="px-6 py-3">Rank</th>
              <th scope="col" class="px-6 py-3">User</th>
              <th
                scope="col"
                class="px-6 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                on:click={() => handleSort("weightLoss")}
              >
                Weight Loss (kg)
                {#if sortKey === "weightLoss"}
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                {/if}
              </th>
              <th
                scope="col"
                class="px-6 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                on:click={() => handleSort("totalGymDays")}
              >
                Total Gym Days
                {#if sortKey === "totalGymDays"}
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                {/if}
              </th>
              <th
                scope="col"
                class="px-6 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                on:click={() => handleSort("currentStreak")}
              >
                Current Streak
                {#if sortKey === "currentStreak"}
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                {/if}
              </th>
              <th
                scope="col"
                class="px-6 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                on:click={() => handleSort("attendancePercentage")}
              >
                Attendance %
                {#if sortKey === "attendancePercentage"}
                  <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                {/if}
              </th>
            </tr>
          </thead>
          <tbody>
            {#each leaderboardData as user, index}
              <tr
                class="border-b border-gray-200 dark:border-gray-800 {getRankStyle(
                  index,
                  user
                )} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                transition:fade
              >
                <td
                  class="px-6 py-4 font-medium text-gray-800 dark:text-gray-200"
                >
                  {index + 1}
                  {getRankIcon(index)}
                </td>
                <td class="px-6 py-4">
                  {user.username}
                  {#if user.userId === currentUser?.uid}
                    <span class="ml-2 text-xs text-blue-500 dark:text-blue-300"
                      >(You)</span
                    >
                  {/if}
                </td>
                <td class="px-6 py-4">
                  {#if user.weightLoss !== null}
                    {#if user.weightLoss > 0}
                      <span>{user.weightLoss} ↓</span>
                    {:else if user.weightLoss < 0}
                      <span>{Math.abs(user.weightLoss)} ↑</span>
                    {:else}
                      <span>0</span>
                    {/if}
                  {:else}
                    N/A
                  {/if}
                </td>
                <td class="px-6 py-4">{user.totalGymDays}</td>
                <td class="px-6 py-4">{user.currentStreak}</td>
                <td class="px-6 py-4">{user.attendancePercentage}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>