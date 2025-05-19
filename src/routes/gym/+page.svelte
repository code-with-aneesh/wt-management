<script lang="ts">
  import { writable, derived, get } from 'svelte/store';
  import { onMount } from 'svelte';
  import {
    format, startOfMonth, endOfMonth,
    addMonths, subMonths,
    addWeeks, subWeeks,
    addDays, subDays,
    isToday, getDay,
    startOfWeek, endOfWeek,
    eachDayOfInterval,
    differenceInDays,
    parseISO
  } from 'date-fns';
  import { fly } from 'svelte/transition';

  // Firebase imports
  import { db } from '$lib/firebase';
  import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
  import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';

  // --- Stores ---
  const currentDate = writable(new Date());
  const selectedView = writable<'month' | 'week' | 'day'>('month');

  const trackedDates = writable<Record<string, 'red' | 'green'>>({});
  const isLoadingTrackedDates = writable<boolean>(true);
  const errorLoadingTrackedDates = writable<string | null>(null);

  // Firestore document ref will be set per user
  let calendarDocRef: ReturnType<typeof doc> | null = null;

  // --- Load data based on authenticated user ---
  onMount(() => {
    isLoadingTrackedDates.set(true);

    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
      // Clean up previous snapshot if any
      if (calendarDocRef) {
        // noop: snapshot unsubscribes are handled in its cleanup
      }

      if (user) {
        calendarDocRef = doc(db, 'calendars', user.uid);
        const unsubscribeSnapshot = onSnapshot(
          calendarDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data && typeof data.dates === 'object' && data.dates !== null) {
                trackedDates.set(data.dates as Record<string, 'red' | 'green'>);
              } else {
                trackedDates.set({});
              }
            } else {
              trackedDates.set({});
              console.log('Creating new calendar on first toggle');
            }
            isLoadingTrackedDates.set(false);
            errorLoadingTrackedDates.set(null);
          },
          (error) => {
            console.error('Error loading calendar:', error);
            errorLoadingTrackedDates.set('Failed to load calendar data');
            isLoadingTrackedDates.set(false);
          }
        );
        // Cleanup the snapshot when user changes or component unmounts
        return () => {
          unsubscribeSnapshot();
        };
      } else {
        // No user logged in
        trackedDates.set({});
        isLoadingTrackedDates.set(false);
        calendarDocRef = null;
      }
    });

    return () => {
      unsubscribeAuth();
    };
  });

  // --- Save to Firestore ---
  async function saveTrackedDatesToFirestore(datesToSave: Record<string, 'red' | 'green'>) {
    if (!calendarDocRef) {
      console.warn('No user calendar ref, aborting save');
      return;
    }
    if (get(isLoadingTrackedDates)) {
      console.warn('Still loading, aborting save');
      return;
    }
    try {
      await setDoc(calendarDocRef, {
        dates: datesToSave,
        lastUpdated: serverTimestamp()
      });
      console.log('Saved');
    } catch (err) {
      console.error('Error saving:', err);
      errorLoadingTrackedDates.set('Failed to save changes');
    }
  }

  // --- Derived summary stats ---
  const summaryStats = derived(trackedDates, ($trackedDates) => {
    const entries = Object.entries($trackedDates).filter(
      ([, color]) => color === 'red' || color === 'green'
    );
    let redCount = 0;
    let greenCount = 0;
    entries.forEach(([, color]) => {
      if (color === 'red') redCount++;
      if (color === 'green') greenCount++;
    });
    if (entries.length === 0) {
      return { redCount, greenCount, unmarkedInRange: 0 };
    }
    const timestamps = entries.map(([ds]) => parseISO(ds + 'T12:00:00Z').getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const totalDays = differenceInDays(new Date(max), new Date(min)) + 1;
    const unmarked = Math.max(0, totalDays - entries.length);
    return { redCount, greenCount, unmarkedInRange: unmarked };
  });

  // --- Derived calendarDays ---
  const calendarDays = derived(
    [currentDate, selectedView],
    ([$currentDate, $selectedView]) => {
      switch ($selectedView) {
        case 'month': {
          const start = startOfMonth($currentDate);
          const end = endOfMonth($currentDate);
          const prefix = getDay(start);
          const daysInMonth = differenceInDays(end, start) + 1;
          const days = [];
          for (let i = prefix; i > 0; i--) days.push({ date: subDays(start, i), isCurrentMonth: false });
          for (let i = 0; i < daysInMonth; i++) days.push({ date: addDays(start, i), isCurrentMonth: true });
          const total = prefix + daysInMonth > 35 ? 42 : 35;
          for (let i = 1; i <= total - days.length; i++) days.push({ date: addDays(end, i), isCurrentMonth: false });
          return days;
        }
        case 'week': {
          const weekStart = startOfWeek($currentDate, { weekStartsOn: 0 });
          return eachDayOfInterval({ start: weekStart, end: endOfWeek($currentDate, { weekStartsOn: 0 }) })
            .map(d => ({ date: d, isCurrentMonth: true }));
        }
        case 'day':
          return [{ date: $currentDate, isCurrentMonth: true }];
      }
    }
  );

  const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

  function getCalendarTitle(date: Date, view: 'month' | 'week' | 'day') {
    if (view === 'month') {
      return format(date, 'MMMM yyyy');
    }
    if (view === 'week') {
      const start = startOfWeek(date, { weekStartsOn: 0 });
      const end = endOfWeek(date, { weekStartsOn: 0 });
      const fmt = (d: Date, str: string) => format(d, str);
      if (fmt(start, 'yyyy') !== fmt(end, 'yyyy')) {
        return `${fmt(start, 'MMM dd, yyyy')} - ${fmt(end, 'MMM dd, yyyy')}`;
      }
      if (fmt(start, 'MMM') !== fmt(end, 'MMM')) {
        return `${fmt(start, 'MMM dd')} - ${fmt(end, 'MMM dd, yyyy')}`;
      }
      return `${fmt(start, 'MMM dd')} - ${fmt(end, 'dd, yyyy')}`;
    }
    return format(date, 'EEEE, MMM dd, yyyy');
  }

  function navigate(direction: 'next' | 'prev') {
    currentDate.update(d => {
      const amt = direction === 'next' ? 1 : -1;
      const view = get(selectedView);
      if (view === 'month') return addMonths(d, amt);
      if (view === 'week') return addWeeks(d, amt);
      return addDays(d, amt);
    });
  }

  function toggleDate(date: Date) {
    const ds = formatDate(date);
    trackedDates.update(curr => {
      const cur = curr[ds];
      const next = cur === 'red' ? 'green' : cur === 'green' ? undefined : 'red';
      const updated = next ? { ...curr, [ds]: next } : Object.fromEntries(Object.entries(curr).filter(([k]) => k !== ds));
      saveTrackedDatesToFirestore(updated);
      return updated;
    });
  }
</script>


<div class="max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 text-gray-800 dark:text-white">

  {#if $isLoadingTrackedDates}
    <div class="text-center p-10 text-gray-500 dark:text-gray-400">
      <div class="animate-pulse">Loading calendar data...</div>
    </div>
  {:else if $errorLoadingTrackedDates}
    <div class="text-center p-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">
      Error: {$errorLoadingTrackedDates}
    </div>
  {/if}

  {#if !$isLoadingTrackedDates}  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg shadow text-center transition-colors duration-200">
        <div class="text-xs sm:text-sm font-medium text-red-600 dark:text-red-300 uppercase tracking-wide">Red Days</div>
        <div class="text-2xl sm:text-3xl font-bold text-red-800 dark:text-red-200 mt-1">
          {$summaryStats.redCount}
        </div>
      </div>
      <div class="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg shadow text-center transition-colors duration-200">
        <div class="text-xs sm:text-sm font-medium text-green-600 dark:text-green-300 uppercase tracking-wide">Green Days</div>
        <div class="text-2xl sm:text-3xl font-bold text-green-800 dark:text-green-200 mt-1">
          {$summaryStats.greenCount}
        </div>
      </div>
      <div class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow text-center transition-colors duration-200">
        <div class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unmarked (in Range)</div>
        <div class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-1">
          {$summaryStats.unmarkedInRange}
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
      <div class="flex items-center gap-3 sm:gap-4">
        <h1 class="text-xl sm:text-2xl font-bold whitespace-nowrap">
          {#key $selectedView + format($currentDate, 'yyyyMMdd')}
            <span transition:fly={{ y: -10, duration: 150 }}>
              {getCalendarTitle($currentDate, $selectedView)}
            </span>
          {/key}
        </h1>
        <div class="flex gap-1">
          <button
            on:click={() => navigate('prev')}
            aria-label="Previous period"
            class="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            on:click={() => navigate('next')}
            aria-label="Next period"
            class="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
        {#each ['month', 'week', 'day'] as view (view)}
          <button
            on:click={() => selectedView.set(view as 'month' | 'week' | 'day')}
            class={`px-3 py-1.5 rounded-md transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-700 ${
              view === $selectedView
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/30'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        {/each}
      </div>
    </div>

    {#key $selectedView}
      <div transition:fly={{ y: 20, duration: 250 }} class="grid gap-1"
        class:grid-cols-7={$selectedView !== 'day'}
        class:grid-cols-1={$selectedView === 'day'}>

        {#if $selectedView !== 'day'}
          {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as dayName (dayName)}
            <div class="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 uppercase tracking-wider">
              {dayName}
            </div>
          {/each}
        {/if}

        {#each $calendarDays as dayInfo (formatDate(dayInfo.date))}
          {@const dateStr = formatDate(dayInfo.date)}
          {@const dayStatus = $trackedDates[dateStr]}
          {@const isSelectable = ($selectedView === 'month' && dayInfo.isCurrentMonth) || $selectedView !== 'month'}
          {@const today = isToday(dayInfo.date)}

          <button
            on:click={() => isSelectable && toggleDate(dayInfo.date)}
            on:keydown={(e) => e.key === 'Enter' && isSelectable && toggleDate(dayInfo.date)}
            role="button"
            aria-pressed={!!dayStatus}
            aria-label={`
              ${format(dayInfo.date, 'EEEE, MMMM do,yyyy')}
              ${dayStatus ? `- Marked ${dayStatus}` : ''}
              ${!isSelectable ? '- (Inactive Date)' : ''}
              ${today ? '- Today' : ''}
            `}
            tabindex={isSelectable ? 0 : -1}
            disabled={!isSelectable || $isLoadingTrackedDates} class:cursor-pointer={isSelectable}
            class:cursor-default={!isSelectable}
            class:opacity-50={(!dayInfo.isCurrentMonth && $selectedView === 'month') || $isLoadingTrackedDates}
            class={`relative rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 group
              ${$selectedView === 'day'
                ? 'h-32 sm:h-40 flex flex-col items-center justify-center text-lg'
                : `flex flex-col items-center justify-center text-center
                  p-0.5 sm:p-1
                  min-h-[2.25rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[4.5rem] aspect-square`
              }
              ${isSelectable && !$isLoadingTrackedDates
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                : ''}
              ${dayStatus === 'red'
                ? '!bg-red-100 dark:!bg-red-900/60 !text-red-800 dark:!text-red-200'
                : dayStatus === 'green'
                ? '!bg-green-100 dark:!bg-green-900/60 !text-green-800 dark:!text-green-200'
                : today
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
            `}
          >
            {#if $selectedView !== 'month'}
              <span class={`block font-medium uppercase tracking-wider
                text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs
                ${today && !dayStatus ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {format(dayInfo.date, 'EEE')}
              </span>
            {/if}
            <span class={`block font-medium rounded-full transition-colors duration-150 flex items-center justify-center
                ${$selectedView === 'day'
                  ? 'text-4xl sm:text-5xl mt-1'
                  : `text-[10px] w-4 h-4 mt-[1px]
                    sm:text-xs sm:w-5 sm:h-5 sm:mt-0.5
                    md:text-sm md:w-6 md:h-6
                    lg:text-base lg:w-7 lg:h-7`
                }
                ${today && !dayStatus ? 'bg-blue-500 !text-white' : ''}
                ${dayStatus ? 'group-hover:bg-opacity-50 dark:group-hover:bg-opacity-50' : isSelectable && !$isLoadingTrackedDates ? 'group-hover:bg-gray-200 dark:group-hover:bg-gray-600' : ''}
                ${dayStatus === 'red' ? 'group-hover:bg-red-200 dark:group-hover:bg-red-800/80' : ''}
                ${dayStatus === 'green' ? 'group-hover:bg-green-200 dark:group-hover:bg-green-800/80' : ''}
              `}>
              {format(dayInfo.date, 'd')}
            </span>
            {#if dayStatus && $selectedView !== 'day'}
              <div class="absolute left-1/2 -translate-x-1/2
                          bottom-0.5 sm:bottom-1 md:bottom-1.5">
                <div class={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                  dayStatus === 'red'
                    ? 'bg-red-500'
                    : 'bg-green-500'
                }`} />
              </div>
            {/if}
          </button>
        {/each}
      </div>
    {/key}
  {/if} </div>

<style>
  .grid-cols-7 {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
</style>