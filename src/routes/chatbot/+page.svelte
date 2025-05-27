<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    Button,
    Input,
    Avatar,
    Spinner,
    Alert,
  } from "flowbite-svelte";
  import {
    PaperPlaneSolid,
    CheckCircleSolid,
    ExclamationCircleOutline,
    TrashBinSolid,
  } from "flowbite-svelte-icons";
  import { auth, db } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { marked } from "marked";
  import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
  } from "firebase/firestore";

  interface Message {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: string;
    status?: "sent" | "delivered";
  }

  let messages: Message[] = [];
  let prompt = "";
  let loading = false;
  let errorMessage = "";
  let currentUser: {
    uid: string;
    displayName?: string;
    photoURL?: string;
  } | null = null;
  let chatContainer: HTMLElement;

  // Auto-scroll to the latest message
  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Format timestamp (India time, 12-hour format, e.g., 2:36 PM)
  function getTimestamp(): string {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    return `${hours}:${minutes} ${ampm}`;
  }

  // Load chat history from Firestore
  async function loadChatHistory() {
    if (!currentUser) {
      errorMessage = "User not authenticated. Please log in.";
      return;
    }
    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("userId", "==", currentUser.uid),
        orderBy("timestamp", "asc")
      );
      const querySnapshot = await getDocs(chatsQuery);
      const loadedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedMessages.push({
          id: doc.id,
          text: data.text,
          sender: data.sender,
          timestamp: data.displayTimestamp || getTimestamp(),
          status: data.status,
        });
      });
      messages = loadedMessages;
      if (messages.length === 0) {
        // No chat history, save and display welcome message
        const welcomeMessage: Message = {
          id: crypto.randomUUID(),
          text: "Hey there! I'm FitBot, your fitness and health buddy. Ask me about workouts, nutrition, or wellness tips! 🏋️‍♂️💪",
          sender: "bot",
          timestamp: getTimestamp(),
        };
        try {
          await addDoc(collection(db, "chats"), {
            userId: currentUser.uid,
            text: welcomeMessage.text,
            sender: welcomeMessage.sender,
            displayTimestamp: welcomeMessage.timestamp,
            timestamp: serverTimestamp(),
          });
          messages = [welcomeMessage];
        } catch (err) {
          console.error("Error saving welcome message: ", err);
          errorMessage = "Failed to initialize chat. Please try again.";
          messages = [welcomeMessage]; // Show welcome message locally even if Firestore fails
        }
      }
      scrollToBottom();
    } catch (err) {
      console.error("Error loading chat history: ", err);
      errorMessage = "Unable to load chat history. Please check your connection and try again.";
      // Initialize with welcome message locally if Firestore fails
      messages = [
        {
          id: crypto.randomUUID(),
          text: "Hey there! I'm FitBot, your fitness and health buddy. Ask me about workouts, nutrition, or wellness tips! 🏋️‍♂️💪",
          sender: "bot",
          timestamp: getTimestamp(),
        },
      ];
      scrollToBottom();
    }
  }

  // Delete all chat history
  async function deleteChatHistory() {
    if (!currentUser) {
      errorMessage = "User not authenticated. Please log in.";
      return;
    }
    loading = true;
    errorMessage = "";
    try {
      const chatsQuery = query(
        collection(db, "chats"),
        where("userId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(chatsQuery);
      const deletePromises = querySnapshot.docs.map((docSnapshot) =>
        deleteDoc(doc(db, "chats", docSnapshot.id))
      );
      await Promise.all(deletePromises);
      const welcomeMessage: Message = {
        id: crypto.randomUUID(),
        text: "Chat history cleared! I'm FitBot, your fitness and health buddy. Ask me about workouts, nutrition, or wellness tips! 🏋️‍♂️💪",
        sender: "bot",
        timestamp: getTimestamp(),
      };
      try {
        await addDoc(collection(db, "chats"), {
          userId: currentUser.uid,
          text: welcomeMessage.text,
          sender: welcomeMessage.sender,
          displayTimestamp: welcomeMessage.timestamp,
          timestamp: serverTimestamp(),
        });
        messages = [welcomeMessage];
      } catch (err) {
        console.error("Error saving welcome message after deletion: ", err);
        errorMessage = "Chat history cleared, but failed to initialize new chat. Please try again.";
        messages = [welcomeMessage]; // Show welcome message locally
      }
      scrollToBottom();
    } catch (err) {
      console.error("Error deleting chat history: ", err);
      errorMessage = "Failed to delete chat history. Please try again.";
    } finally {
      loading = false;
    }
  }

  // Firebase authentication and load chat history
  onMount(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = {
          uid: user.uid,
          displayName: user.displayName ?? undefined,
          photoURL: user.photoURL ?? undefined,
        };
        loadChatHistory();
      } else {
        currentUser = null;
        errorMessage = "Please log in to access the chatbot.";
        goto("/");
      }
    });
  });

  async function sendMessage() {
    if (!prompt.trim()) {
      errorMessage = "Please enter a message to send.";
      return;
    }
    if (!currentUser) {
      errorMessage = "User not authenticated. Please log in.";
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: prompt,
      sender: "user",
      timestamp: getTimestamp(),
      status: "sent",
    };

    messages = [...messages, userMessage];
    prompt = "";
    loading = true;
    errorMessage = "";

    // Save user message to Firestore
    try {
      await addDoc(collection(db, "chats"), {
        userId: currentUser.uid,
        text: userMessage.text,
        sender: userMessage.sender,
        displayTimestamp: userMessage.timestamp,
        status: userMessage.status,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error saving user message: ", err);
      errorMessage = "Failed to save your message. Please try again.";
      messages = messages.slice(0, -1); // Remove unsaved message
      loading = false;
      scrollToBottom();
      return;
    }

    try {
      const res = await fetch("/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage.text }),
      });

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      const botMessage: Message = {
        id: crypto.randomUUID(),
        text: data.response,
        sender: "bot",
        timestamp: getTimestamp(),
      };

      // Save bot message to Firestore
      try {
        await addDoc(collection(db, "chats"), {
          userId: currentUser.uid,
          text: botMessage.text,
          sender: botMessage.sender,
          displayTimestamp: botMessage.timestamp,
          timestamp: serverTimestamp(),
        });
        messages = [
          ...messages.slice(0, -1),
          { ...userMessage, status: "delivered" },
          botMessage,
        ];
      } catch (err) {
        console.error("Error saving bot response: ", err);
        errorMessage = "Received a response, but failed to save it. Please try again.";
        messages = [...messages.slice(0, -1), { ...userMessage, status: "delivered" }, botMessage]; // Show bot message locally
      }
    } catch (err) {
      console.error("Error fetching bot response: ", err);
      errorMessage = "Failed to get response from FitBot. Please check your connection and try again.";
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
  <!-- Chat Container -->
  <main
    bind:this={chatContainer}
    class="container mx-auto px-4 py-8 dark:bg-gray-900 dark:text-gray-300 min-h-[calc(100vh-8rem)] overflow-y-auto"
  >
    <div class="w-full space-y-4">
      {#each messages as message (message.id)}
        <div
          class="flex {message.sender === 'user'
            ? 'justify-end'
            : 'justify-start'} animate-slide-in"
        >
          <div
            class="max-w-[70%] p-3 rounded-lg shadow-sm {message.sender ===
            'user'
              ? 'bg-green-500 text-white rounded-br-none'
              : 'bg-white dark:bg-gray-600 dark:text-white rounded-bl-none'}"
          >
            {#if message.sender === "bot"}
              <div class="text-sm lg:text-base markdown-content">
                {@html renderMarkdown(message.text)}
              </div>
            {:else}
              <p class="text-sm lg:text-base whitespace-pre-wrap">
                {message.text}
              </p>
            {/if}
            <div
              class="flex justify-between items-center mt-1 text-xs opacity-80"
            >
              <span>{message.timestamp}</span>
              {#if message.sender === "user" && message.status}
                <span class="flex items-center">
                  {#if message.status === "sent"}
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
          <div
            class="max-w-[70%] p-3 rounded-lg bg-white dark:bg-gray-600 dark:text-white rounded-bl-none"
          >
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
            <ExclamationCircleOutline
              class="w-5 h-5 lg:w-6 lg:h-6 dark:text-red-400"
            />
          </svelte:fragment>
          <span class="font-medium dark:text-white">{errorMessage}</span>
        </Alert>
      {/if}
    </div>
  </main>

  <!-- Input Area -->
  <footer class="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 -mt-4">
    <div class="container mx-auto flex flex-col gap-4">
      <div class="flex gap-2">
        <Input
          bind:value={prompt}
          placeholder="Ask FitBot about fitness or health..."
          class="rounded-lg h-10 lg:h-12 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm lg:text-base flex-1"
          disabled={loading}
          on:keypress={(e) => e.key === "Enter" && sendMessage()}
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
      <Button
        color="red"
        size="md"
        class="rounded-lg h-10 lg:h-12 w-full sm:w-auto transform transition hover:scale-[1.02] dark:enabled:hover:bg-red-700 text-sm lg:text-base"
        on:click={deleteChatHistory}
        disabled={loading || !currentUser}
        aria-label="Delete chat history"
      >
        <TrashBinSolid class="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
        Delete Chat History
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

</style>