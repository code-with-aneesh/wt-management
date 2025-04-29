<script lang="ts">
  import { writable, derived } from 'svelte/store';
  import {
    format, startOfMonth, endOfMonth, subMonths, addMonths,
    subWeeks, addWeeks, subDays, addDays, isToday, getDay,
    startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays,
    parseISO // Import parseISO for reliable date string parsing
  } from 'date-fns';
  import { fly } from 'svelte/transition';

  // Stores
  const currentDate = writable(new Date());
  const selectedView = writable<'month' | 'week' | 'day'>('month');
  // Persist trackedDates to localStorage (optional, but good for UX)
  const storedTrackedDates = typeof localStorage !== 'undefined' ? localStorage.getItem('trackedDates') : null;
  const initialTrackedDates = storedTrackedDates ? JSON.parse(storedTrackedDates) : {};
  const trackedDates = writable<Record<string, 'red' | 'green'>>(initialTrackedDates);

  // Subscribe to changes and update localStorage
  if (typeof localStorage !== 'undefined') {
    trackedDates.subscribe(value => {
      localStorage.setItem('trackedDates', JSON.stringify(value));
    });
  }


  // Derived store for summary statistics
  const summaryStats = derived(
    trackedDates,
    ($trackedDates) => {
      // Filter out entries that might have undefined values if localStorage had issues
      const entries = Object.entries($trackedDates).filter(
          ([, color]) => color === 'red' || color === 'green'
      );

      let redCount = 0;
      let greenCount = 0;
      let unmarkedInRange = 0;
      let firstMarkedDate: Date | null = null;
      let lastMarkedDate: Date | null = null;

      if (entries.length === 0) {
        // No dates marked
        return { redCount: 0, greenCount: 0, unmarkedInRange: 0 };
      }

      // Use Set to easily get min/max timestamps
      const dateTimestamps = new Set<number>();

      entries.forEach(([dateString, color]) => {
        if (color === 'red') {
          redCount++;
        } else if (color === 'green') {
          greenCount++;
        }
        try {
            // Use parseISO for robust parsing of YYYY-MM-DD
            // Add time (midday UTC) to avoid potential timezone issues when getting min/max
            const date = parseISO(dateString + 'T12:00:00Z');
            if (!isNaN(date.getTime())) { // Check if parsing was successful
                 dateTimestamps.add(date.getTime());
            } else {
                console.warn(`Failed to parse date string: ${dateString}`);
            }
        } catch (e) {
            console.error(`Error parsing date string: ${dateString}`, e);
        }
      });

      if (dateTimestamps.size === 0) {
         // If all parsing failed
         return { redCount: 0, greenCount: 0, unmarkedInRange: 0 };
      }

      const minTimestamp = Math.min(...dateTimestamps);
      const maxTimestamp = Math.max(...dateTimestamps);

      firstMarkedDate = new Date(minTimestamp);
      lastMarkedDate = new Date(maxTimestamp);

      // Calculate total days *in the range* (inclusive)
      const totalDaysInRange = differenceInDays(lastMarkedDate, firstMarkedDate) + 1;
      // Count marked days *within this specific range* for unmarked calculation
      // Note: redCount and greenCount are total counts overall, not just in range.
      const totalMarkedCount = entries.length; // Use length of valid entries

      unmarkedInRange = totalDaysInRange - totalMarkedCount;

      // Ensure unmarked count isn't negative
      unmarkedInRange = Math.max(0, unmarkedInRange);

      return { redCount, greenCount, unmarkedInRange };
    }
  );

  // Derived calendar data
  const calendarDays = derived(
    [currentDate, selectedView],
    ([$currentDate, $selectedView]) => {
      switch ($selectedView) {
        case 'month':
          const monthStart = startOfMonth($currentDate);
          const monthEnd = endOfMonth($currentDate);
          // Ensure week starts on Sunday (getDay returns 0 for Sunday)
          const startDayIndex = getDay(monthStart); // 0 = Sunday, 6 = Saturday
          const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;

          const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

          // Days from previous month
          for (let i = startDayIndex; i > 0; i--) {
            days.push({ date: subDays(monthStart, i), isCurrentMonth: false });
          }

          // Days from current month
          for (let i = 0; i < daysInMonth; i++) {
            days.push({ date: addDays(monthStart, i), isCurrentMonth: true });
          }

          // Days from next month (fill up to 6 weeks = 42 cells)
          // Determine if 5 or 6 rows are needed based on start day and month length
          const totalCells = startDayIndex + daysInMonth > 35 ? 42 : 35;
          const remaining = totalCells - days.length;
          for (let i = 1; i <= remaining; i++) {
            days.push({ date: addDays(monthEnd, i), isCurrentMonth: false });
          }
          return days;

        case 'week':
          const weekStart = startOfWeek($currentDate, { weekStartsOn: 0 }); // 0 = Sunday
          return eachDayOfInterval({
            start: weekStart,
            end: endOfWeek($currentDate, { weekStartsOn: 0 })
          }).map(date => ({ date, isCurrentMonth: true })); // All days in week view are "current"

        case 'day':
          return [{ date: $currentDate, isCurrentMonth: true }]; // Only the current date
      }
    }
  );

  // Date formatting helper
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  // Navigation functions
  function navigate(direction: 'next' | 'prev') {
    currentDate.update($date => {
      const amount = direction === 'next' ? 1 : -1;
      switch ($selectedView) {
        case 'month': return addMonths($date, amount);
        case 'week': return addWeeks($date, amount);
        case 'day': return addDays($date, amount);
      }
    });
  }

  // Toggle date status - Correctly removes the key when unmarking
  function toggleDate(date: Date) {
    const dateString = formatDate(date);
    trackedDates.update(dates => {
      const current = dates[dateString];
      const newState = current === 'red' ? 'green' : current === 'green' ? undefined : 'red';

      if (newState) {
        // Add or update the date
        return { ...dates, [dateString]: newState };
      } else {
        // Remove the date completely when toggling from green to undefined
        const { [dateString]: _, ...rest } = dates; // Use object destructuring to remove the key
        return rest;
      }
    });
  }
</script>

<div class="max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 text-gray-800 dark:text-white">

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
            {format($currentDate, $selectedView === 'month' ? 'MMMM yyyy' :
              $selectedView === 'week' ? `MMM dd${format(addDays($currentDate, 6), '-dd, yyyy')}` : 'EEEE, MMM dd, yyyy')}
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
          on:click={() => selectedView.set(view)}
          class={`px-3 py-1.5 rounded-md transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-700 ${
            view === $selectedView
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/30'
          }`}
        >
          {view.charAt(0).toUpperCase() + view.slice(1)} </button>
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

      {#each $calendarDays as dayInfo (formatDate(dayInfo.date))} {@const dateStr = formatDate(dayInfo.date)}
        {@const dayStatus = $trackedDates[dateStr]}
        {@const isSelectable = ($selectedView === 'month' && dayInfo.isCurrentMonth) || $selectedView !== 'month'}
        {@const today = isToday(dayInfo.date)}

        <button
          on:click={() => isSelectable && toggleDate(dayInfo.date)}
          on:keydown={(e) => e.key === 'Enter' && isSelectable && toggleDate(dayInfo.date)}
          role="button"
          aria-pressed={!!dayStatus}
          aria-label={`
            ${format(dayInfo.date, 'EEEE, MMMM do, yyyy')}
            ${dayStatus ? `- Marked ${dayStatus}` : ''}
            ${!isSelectable ? '- (Inactive Date)' : ''}
            ${today ? '- Today' : ''}
          `}
          tabindex={isSelectable ? 0 : -1}
          disabled={!isSelectable}
          class:cursor-pointer={isSelectable}
          class:cursor-default={!isSelectable}
          class:opacity-50={!dayInfo.isCurrentMonth && $selectedView === 'month'}
          class={`relative rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 group
            ${$selectedView === 'day' ? 'h-32 sm:h-40 flex flex-col items-center justify-center text-lg' : 'aspect-square flex flex-col items-center justify-center p-1'}
            ${isSelectable
              ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
              : ''}
            ${dayStatus === 'red'
              ? '!bg-red-100 dark:!bg-red-900/60 !text-red-800 dark:!text-red-200'
              : dayStatus === 'green'
              ? '!bg-green-100 dark:!bg-green-900/60 !text-green-800 dark:!text-green-200'
              : today // Apply 'today' styling only if not red/green
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
          `}
        >
          {#if $selectedView !== 'month'}
            <span class="block text-[10px] sm:text-xs font-medium uppercase tracking-wider ${today && !dayStatus ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">
              {format(dayInfo.date, 'EEE')}
            </span>
          {/if}

          <span class={`block font-medium rounded-full transition-colors duration-150
              ${$selectedView === 'day' ? 'text-4xl sm:text-5xl mt-1' : 'text-sm sm:text-base w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center mt-0.5'}
              ${today && !dayStatus ? 'bg-blue-500 !text-white' : ''}
              ${dayStatus ? 'group-hover:bg-opacity-50 dark:group-hover:bg-opacity-50' : isSelectable ? 'group-hover:bg-gray-200 dark:group-hover:bg-gray-600' : ''}
              ${dayStatus === 'red' ? 'group-hover:bg-red-200 dark:group-hover:bg-red-800/80' : ''}
              ${dayStatus === 'green' ? 'group-hover:bg-green-200 dark:group-hover:bg-green-800/80' : ''}
           `}>
            {format(dayInfo.date, 'd')}
          </span>

          {#if dayStatus && $selectedView !== 'day'}
            <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2">
              <div class={`w-1.5 h-1.5 rounded-full ${
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

</div>
<style>
  /* Ensure grid cells in month/week view have a minimum height */
  .grid-cols-7 {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
  .grid-cols-7 > button {
      min-height: 4.5rem; /* Adjust as needed for your design */
      height: 100%; /* Make buttons fill the cell height */
  }

  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  /* REMOVED the button:focus-visible rule as it's handled by utility classes */

  /* Optional: If you still want a global focus style for elements *not*
     using Tailwind's focus:ring utilities, you could use a hex code,
     but it's generally better to stick to utility classes. */
  /*
  button:focus-visible, a:focus-visible {
    outline: 2px solid #3b82f6; // Hardcoded hex for blue-500
    outline-offset: 2px;
  }
  */
</style>