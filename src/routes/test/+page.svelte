<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Button, Input, Avatar, Spinner, DarkMode, Alert } from 'flowbite-svelte';
  import { PaperPlaneSolid, CheckCircleSolid, ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { marked } from 'marked';

  interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: string;
    status?: 'sent' | 'delivered';
  }

  let messages: Message[] = [];
  let prompt = '';
  let loading = false;
  let errorMessage = '';
  let currentUser: { uid: string; displayName?: string; photoURL?: string } | null = null;
  let chatContainer: HTMLElement;

  // Auto-scroll to the latest message
  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Format timestamp (India time, 12-hour format, 11:25 AM IST, May 27, 2025)
  function getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${ampm}`;
  }

  // Firebase authentication
  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = {
          uid: user.uid,
          displayName: user.displayName ?? undefined,
          photoURL: user.photoURL ?? undefined
        };
      } else {
        currentUser = null;
        goto('/'); // Redirect to login, matching health metrics tracker
      }
    });

    // Initial welcome message
    messages = [
      {
        id: crypto.randomUUID(),
        text: "Hey there! I'm FitBot, your fitness and health buddy. Ask me about workouts, nutrition, or wellness tips! 🏋️‍♂️💪",
        sender: 'bot',
        timestamp: getTimestamp(),
      },
    ];
    scrollToBottom();
  });

  async function sendMessage() {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: prompt,
      sender: 'user',
      timestamp: getTimestamp(),
      status: 'sent',
    };

    messages = [...messages, userMessage];
    prompt = '';
    loading = true;
    errorMessage = '';

    await scrollToBottom();

    try {
      const res = await fetch('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage.text }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await res.json();
      messages = [
        ...messages.slice(0, -1),
        { ...userMessage, status: 'delivered' },
        {
          id: crypto.randomUUID(),
          text: data.response,
          sender: 'bot',
          timestamp: getTimestamp(),
        },
      ];
    } catch (err) {
      errorMessage = 'Failed to get response from FitBot. Please try again.';
      console.error(err);
    } finally {
      loading = false;
      scrollToBottom();
    }
  }

  // Render Markdown safely
  function renderMarkdown(text: string): string {
    return marked.parse(text, { gfm: true, breaks: true });
  }
</script>

<div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
  <!-- Header -->
  <header class="bg-green-600 dark:bg-green-800 text-white p-4 flex items-center justify-between shadow-md">
    <div class="flex items-center gap-3">
      <Avatar src="/fitbot.png" alt="FitBot Avatar" size="sm" class="border-2 border-white dark:border-gray-700" />
      <div>
        <h2 class="text-lg sm:text-xl lg:text-2xl font-semibold">FitBot</h2>
        <p class="text-xs sm:text-sm opacity-80">Your Fitness & Health Assistant</p>
      </div>
    </div>
    <DarkMode class="text-white hover:scale-110 transition-transform" />
  </header>

  <!-- Chat Container -->
  <main bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-700">
    <div class="space-y-4">
      {#each messages as message (message.id)}
        <div
          class="flex {message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in"
        >
          <div
            class="max-w-[70%] p-3 rounded-lg shadow-sm {message.sender === 'user'
              ? 'bg-green-500 text-white rounded-br-none'
              : 'bg-white dark:bg-gray-600 dark:text-white rounded-bl-none'}"
          >
            {#if message.sender === 'bot'}
              <div class="text-sm lg:text-base markdown-content">{@html renderMarkdown(message.text)}</div>
            {:else}
              <p class="text-sm lg:text-base whitespace-pre-wrap">{message.text}</p>
            {/if}
            <div class="flex justify-between items-center mt-1 text-xs opacity-80">
              <span>{message.timestamp}</span>
              {#if message.sender === 'user' && message.status}
                <span class="flex items-center">
                  {#if message.status === 'sent'}
                    <CheckCircleSolid class="w-3 h-3" />
                  {:else}
                    <CheckCircleSolid class="w-3 h-3 text-blue-300" />
                  {/if}
                </span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
      {#if loading}
        <div class="flex justify-start animate-slide-in">
          <div class="max-w-[70%] p-3 rounded-lg bg-white dark:bg-gray-600 dark:text-white rounded-bl-none">
            <Spinner size="sm" color="green" />
            <span class="text-sm ml-2">FitBot is typing...</span>
          </div>
        </div>
      {/if}
      {#if errorMessage}
        <Alert
          color="red"
          class="max-w-[70%] mx-auto shadow-md rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm lg:text-base animate-slide-in"
          dismissable
        >
          <svelte:fragment slot="icon">
            <ExclamationCircleOutline class="w-5 h-5 lg:w-6 lg:h-6 dark:text-red-400" />
          </svelte:fragment>
          <span class="font-medium dark:text-white">{errorMessage}</span>
        </Alert>
      {/if}
    </div>
  </main>

  <!-- Input Area -->
  <footer class="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
    <div class="max-w-full sm:max-w-3xl mx-auto flex gap-2">
      <Input
        bind:value={prompt}
        placeholder="Ask FitBot about fitness or health..."
        class="rounded-lg h-10 lg:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm lg:text-base flex-1"
        disabled={loading}
        on:keypress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <Button
        color="green"
        size="md"
        class="rounded-lg h-10 lg:h-12 w-10 lg:w-12 flex items-center justify-center transform transition hover:scale-[1.02] dark:enabled:hover:bg-green-700"
        on:click={sendMessage}
        disabled={loading || !prompt.trim()}
        aria-label="Send message"
      >
        <PaperPlaneSolid class="w-5 h-5 lg:w-6 lg:h-6" />
      </Button>
    </div>
  </footer>
</div>

<style>
  .animate-slide-in {
    animation: slideIn 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(20px);
  }

  @keyframes slideIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .markdown-content {
    line-height: 1.6;
  }

  .markdown-content h1,
  .markdown-content h2,
  .markdown-content h3 {
    font-weight: bold;
    margin: 0.5em 0;
  }

  .markdown-content h1 {
    font-size: 1.5em;
  }

  .markdown-content h2 {
    font-size: 1.25em;
  }

  .markdown-content h3 {
    font-size: 1em;
  }

  .markdown-content ul,
  .markdown-content ol {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .markdown-content li {
    margin-bottom: 0.25em;
  }

  .markdown-content p {
    margin: 0.5em 0;
  }

  .markdown-content code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: monospace;
  }

  .markdown-content pre {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
  }

  .dark .markdown-content code,
  .dark .markdown-content pre {
    background-color: rgba(255, 255, 255, 0.1);
  }
</style>