<!-- <script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { db, auth } from "$lib/firebase";
    import { DarkMode } from "flowbite-svelte";
    import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, Timestamp, onSnapshot, getDoc } from "firebase/firestore";
    import { onAuthStateChanged } from "firebase/auth";
    import { goto } from "$app/navigation";
    import { marked } from "marked";
    import DOMPurify from "dompurify";
    import * as nodeEmoji from "node-emoji";
    import { Editor } from "@tiptap/core";
    import StarterKit from "@tiptap/starter-kit";
  
    // Forum Message Data
    interface ForumMessage {
      id: string;
      content: string;
      timestamp: Date;
      author: string;
      parentId: string | null;
      upvotes: number;
      downvotes: number;
      pinned: boolean;
    }
  
    // User Vote Data
    interface UserVote {
      id: string;
      userId: string;
      messageId: string;
      voteType: "up" | "down";
    }
  
    let messages: ForumMessage[] = [];
    let userVotes: UserVote[] = [];
    let currentUser: { uid: string; displayName?: string } | null = null;
    let isAdmin = false;
    let loading = true;
    let error: string | null = null;
    let formError: string | null = null;
    let formSuccess: string | null = null;
    let replyTo: ForumMessage | null = null;
    let collapsedThreads: Set<string> = new Set();
    let sortBy: "newest" | "oldest" | "mostUpvoted" = "newest";
    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeVotes: (() => void) | null = null;
  
    // Tiptap Editor
    let editor: Editor | null = null;
    let editorElement: HTMLElement | null = null;
  
    onMount(() => {
      editor = new Editor({
        element: editorElement!,
        extensions: [StarterKit],
        content: "",
        editorProps: {
          attributes: {
            class: "prose dark:prose-invert max-w-none p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 min-h-[100px]",
          },
        },
      });
      return () => editor?.destroy();
    });
  
    // Sample Forum Message
    const sampleMessage = {
      content: `
  # Welcome to the Health Forum! 😊
  
  Join the conversation and share your health tips! Here are some ideas to get started:
  
  - **What's your favorite workout routine?** Share your go-to exercises! 💪
  - **Healthy recipes?** Post your favorite nutritious meals! 🥗
  - **Motivation tips?** How do you stay on track with your goals?
  
  Feel free to reply to this message or start a new thread. Let's build a supportive community! 🚀
      `,
      timestamp: Timestamp.fromDate(new Date("2025-05-19T12:00:00Z")),
      author: "Health Team",
      parentId: null,
      upvotes: 0,
      downvotes: 0,
      pinned: false,
    };
  
    // Markdown renderer
    const renderer = new marked.Renderer();
    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true,
    });
  
    // Sanitize and emojify markdown output
    function renderMarkdown(content: string): string {
      const emojified = nodeEmoji.emojify(content);
      const rawHtml = marked(emojified);
      return DOMPurify.sanitize(rawHtml);
    }
  
    // Fetch initial data and set up real-time listeners
    async function initializeForum() {
      try {
        // Check if messages exist
        const messagesQuery = query(collection(db, "forumMessages"));
        const messagesSnapshot = await getDocs(messagesQuery);
        messages = messagesSnapshot.docs.map((doc) => ({
          id: doc.id,
          content: doc.data().content,
          timestamp: doc.data().timestamp.toDate(),
          author: doc.data().author,
          parentId: doc.data().parentId || null,
          upvotes: doc.data().upvotes || 0,
          downvotes: doc.data().downvotes || 0,
          pinned: doc.data().pinned || false,
        }));
  
        // If no messages, add sample message
        if (messages.length === 0) {
          await addDoc(collection(db, "forumMessages"), sampleMessage);
          const updatedSnapshot = await getDocs(messagesQuery);
          messages = updatedSnapshot.docs.map((doc) => ({
            id: doc.id,
            content: doc.data().content,
            timestamp: doc.data().timestamp.toDate(),
            author: doc.data().author,
            parentId: doc.data().parentId || null,
            upvotes: doc.data().upvotes || 0,
            downvotes: doc.data().downvotes || 0,
            pinned: doc.data().pinned || false,
          }));
        }
  
        // Set up real-time listeners
        unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
          messages = snapshot.docs.map((doc) => ({
            id: doc.id,
            content: doc.data().content,
            timestamp: doc.data().timestamp.toDate(),
            author: doc.data().author,
            parentId: doc.data().parentId || null,
            upvotes: doc.data().upvotes || 0,
            downvotes: doc.data().downvotes || 0,
            pinned: doc.data().pinned || false,
          }));
        });
  
        unsubscribeVotes = onSnapshot(collection(db, "userVotes"), (snapshot) => {
          userVotes = snapshot.docs.map((doc) => ({
            id: doc.id,
            userId: doc.data().userId,
            messageId: doc.data().messageId,
            voteType: doc.data().voteType,
          }));
        });
      } catch (err) {
        error = "Failed to load or initialize forum";
        console.error(err);
      }
    }
  
    // Check admin status
    async function checkAdminStatus(userId: string) {
      const userDoc = await getDoc(doc(db, "users", userId));
      isAdmin = userDoc.exists() && userDoc.data()?.isAdmin === true;
    }
  
    // Handle message submission
    async function handleSubmit() {
      formError = null;
      formSuccess = null;
  
      const content = editor?.getHTML();
      if (!content || content === "<p></p>") {
        formError = "Message content is required";
        return;
      }
  
      try {
        await addDoc(collection(db, "forumMessages"), {
          content: content,
          timestamp: Timestamp.fromDate(new Date()),
          author: currentUser?.displayName || currentUser?.uid || "Anonymous",
          parentId: replyTo?.id || null,
          upvotes: 0,
          downvotes: 0,
          pinned: false,
        });
  
        editor?.commands.clearContent();
        replyTo = null;
        formSuccess = "Message posted successfully!";
      } catch (err) {
        formError = "Failed to post message";
        console.error(err);
      }
    }
  
    // Handle voting
    async function handleVote(messageId: string, voteType: "up" | "down") {
      if (!currentUser) return;
  
      const existingVote = userVotes.find(
        (v) => v.userId === currentUser.uid && v.messageId === messageId
      );
  
      try {
        const messageRef = doc(db, "forumMessages", messageId);
        const voteData = {
          userId: currentUser.uid,
          messageId,
          voteType,
        };
  
        if (existingVote) {
          if (existingVote.voteType === voteType) {
            // Remove vote
            await updateDoc(messageRef, {
              [voteType === "up" ? "upvotes" : "downvotes"]: Math.max(
                messages.find((m) => m.id === messageId)?.[voteType === "up" ? "upvotes" : "downvotes"] - 1,
                0
              ),
            });
            await updateDoc(doc(db, "userVotes", existingVote.id), { voteType: null });
          } else {
            // Switch vote
            await updateDoc(messageRef, {
              upvotes: voteType === "up" ? messages.find((m) => m.id === messageId)!.upvotes + 1 : Math.max(messages.find((m) => m.id === messageId)!.upvotes - 1, 0),
              downvotes: voteType === "down" ? messages.find((m) => m.id === messageId)!.downvotes + 1 : Math.max(messages.find((m) => m.id === messageId)!.downvotes - 1, 0),
            });
            await updateDoc(doc(db, "userVotes", existingVote.id), { voteType });
          }
        } else {
          // New vote
          await updateDoc(messageRef, {
            [voteType === "up" ? "upvotes" : "downvotes"]: messages.find((m) => m.id === messageId)![voteType === "up" ? "upvotes" : "downvotes"] + 1,
          });
          await addDoc(collection(db, "userVotes"), voteData);
        }
      } catch (err) {
        console.error("Failed to vote:", err);
      }
    }
  
    // Handle pinning
    async function handlePin(messageId: string) {
      if (!isAdmin) return;
      try {
        await updateDoc(doc(db, "forumMessages", messageId), {
          pinned: !messages.find((m) => m.id === messageId)!.pinned,
        });
      } catch (err) {
        console.error("Failed to pin/unpin:", err);
      }
    }
  
    // Toggle thread collapse
    function toggleCollapse(messageId: string) {
      if (collapsedThreads.has(messageId)) {
        collapsedThreads.delete(messageId);
      } else {
        collapsedThreads.add(messageId);
      }
      collapsedThreads = new Set(collapsedThreads); // Trigger reactivity
    }
  
    // Set reply target
    function startReply(message: ForumMessage) {
      replyTo = message;
      editor?.commands.setContent(`<blockquote>Replying to ${message.author}</blockquote><p></p>`);
      editor?.commands.focus();
    }
  
    // Cancel reply
    function cancelReply() {
      replyTo = null;
      editor?.commands.clearContent();
    }
  
    // Get sorted and threaded messages
    function getThreadedMessages(): { message: ForumMessage; replies: ForumMessage[] }[] {
      let sortedMessages = [...messages];
      if (sortBy === "newest") {
        sortedMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      } else if (sortBy === "oldest") {
        sortedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } else if (sortBy === "mostUpvoted") {
        sortedMessages.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      }
  
      const pinned = sortedMessages.filter((m) => m.pinned);
      const nonPinned = sortedMessages.filter((m) => !m.pinned);
      const topLevel = [...pinned, ...nonPinned].filter((m) => !m.parentId);
  
      return topLevel.map((message) => ({
        message,
        replies: messages.filter((m) => m.parentId === message.id),
      }));
    }
  
    // Get user avatar initials
    function getAvatarInitials(author: string): string {
      return author.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
    }
  
    onMount(async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          goto("/");
          return;
        }
        currentUser = user;
        await checkAdminStatus(user.uid);
        await initializeForum();
        loading = false;
      });
    });
  
    onDestroy(() => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeVotes) unsubscribeVotes();
    });
  
    // Format date
    function formatDate(date: Date): string {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  </script>
  
  <main class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
    {#if loading}
      <div class="flex justify-center items-center h-screen">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"
        ></div>
      </div>
    {:else if error}
      <div
        class="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-6 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30"
      >
        <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p class="text-lg font-medium">{error}</p>
        </div>
      </div>
    {:else}
      <div class="max-w-4xl mx-auto">
        <!-- Dark Mode Toggle
        <div class="absolute top-4 right-4">
          <DarkMode
            class="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg p-2"
          />
        </div>
  
        <!-- Forum Header
        <div class="mb-8">
          <h1
            class="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2"
          >
            <svg
              class="w-8 h-8 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            Health Forum
          </h1>
          <p class="text-gray-600 dark:text-gray-300">
            Connect, share, and grow with our community
          </p>
        </div>
  
        <!-- Sorting Options 
        <div class="flex items-center gap-4 mb-6">
          <label for="sortBy" class="text-sm text-gray-700 dark:text-gray-300">Sort by:</label>
          <select
            id="sortBy"
            bind:value={sortBy}
            class="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="mostUpvoted">Most Upvoted</option>
          </select>
        </div>
  
        <!-- Message Creation Form --
        <div
          class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-xl"
        >
          <h2
            class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"
          >
            <svg
              class="w-5 h-5 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15.414a2 2 0 01-2.828 0l-4.586-4.586"
              />
            </svg>
            Post a Message
          </h2>
          {#if replyTo}
            <div class="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg mb-4 flex items-center justify-between">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Replying to {replyTo.author}
              </p>
              <button
                on:click={cancelReply}
                class="text-blue-500 dark:text-blue-400 text-sm hover:underline"
              >
                Cancel
              </button>
            </div>
          {/if}
          {#if formError}
            <div
              class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 flex items-center gap-2 text-red-600 dark:text-red-400"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p class="text-sm">{formError}</p>
            </div>
          {/if}
          {#if formSuccess}
            <div
              class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4 flex items-center gap-2 text-green-600 dark:text-green-400"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p class="text-sm">{formSuccess}</p>
            </div>
          {/if}
          <div class="space-y-4">
            <div bind:this={editorElement}></div>
            <button
              on:click={handleSubmit}
              class="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
            >
              Post Message
            </button>
          </div>
        </div>
  
        <!-- Forum Messages --
        <div class="space-y-4">
          {#each getThreadedMessages() as { message, replies }}
            <div
              class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-lg {message.pinned ? 'border-blue-300 dark:border-blue-600' : ''}"
            >
              <div class="flex items-start gap-3">
                <!-- Avatar --
                <div
                  class="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 text-white flex items-center justify-center text-sm font-medium"
                >
                  {getAvatarInitials(message.author)}
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-800 dark:text-white">{message.author}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">{formatDate(message.timestamp)}</span>
                      {#if message.pinned}
                        <span class="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 8a3 3 0 100-6 3 3 0 000 6zm7.5 2.5l-4.5 4.5a2 2 0 01-2.83 0l-1.5-1.5a2 2 0 010-2.83l4.5-4.5a2 2 0 012.83 0l1.5 1.5a2 2 0 010 2.83z" />
                          </svg>
                          Pinned
                        </span>
                      {/if}
                    </div>
                    {#if isAdmin}
                      <button
                        on:click={() => handlePin(message.id)}
                        class="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs flex items-center gap-1"
                      >
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 8a3 3 0 100-6 3 3 0 000 6zm7.5 2.5l-4.5 4.5a2 2 0 01-2.83 0l-1.5-1.5a2 2 0 010-2.83l4.5-4.5a2 2 0 012.83 0l1.5 1.5a2 2 0 010 2.83z" />
                        </svg>
                        {message.pinned ? "Unpin" : "Pin"}
                      </button>
                    {/if}
                  </div>
                  <div
                    class="markdown-content text-gray-700 dark:text-gray-200 mb-3"
                  >
                    {@html renderMarkdown(message.content)}
                  </div>
                  <div class="flex items-center gap-4 text-sm">
                    <div class="flex items-center gap-1">
                      <button
                        on:click={() => handleVote(message.id, "up")}
                        class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 {userVotes.find((v) => v.userId === currentUser?.uid && v.messageId === message.id && v.voteType === 'up') ? 'text-blue-500 dark:text-blue-400' : ''}"
                      >
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 3l-7 7h4v7h6v-7h4l-7-7z" />
                        </svg>
                      </button>
                      <span class="text-gray-600 dark:text-gray-300">{message.upvotes - message.downvotes}</span>
                      <button
                        on:click={() => handleVote(message.id, "down")}
                        class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 {userVotes.find((v) => v.userId === currentUser?.uid && v.messageId === message.id && v.voteType === 'down') ? 'text-blue-500 dark:text-blue-400' : ''}"
                      >
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 17l7-7h-4v-7h-6v7H3l7 7z" />
                        </svg>
                      </button>
                    </div>
                    <button
                      on:click={() => startReply(message)}
                      class="text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
              {#if replies.length > 0}
                <div class="mt-4 pl-6 border-l-2 border-gray-200 dark:border-gray-600">
                  <button
                    on:click={() => toggleCollapse(message.id)}
                    class="text-blue-500 dark:text-blue-400 hover:underline text-sm mb-2 flex items-center gap-1"
                  >
                    {#if collapsedThreads.has(message.id)}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                      Show {replies.length} {replies.length === 1 ? "reply" : "replies"}
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                      Hide replies
                    {/if}
                  </button>
                  {#if !collapsedThreads.has(message.id)}
                    {#each replies as reply}
                      <div class="mt-3">
                        <div class="flex items-start gap-3">
                          <div
                            class="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 text-white flex items-center justify-center text-xs font-medium"
                          >
                            {getAvatarInitials(reply.author)}
                          </div>
                          <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="text-sm font-medium text-gray-800 dark:text-white">{reply.author}</span>
                              <span class="text-xs text-gray-500 dark:text-gray-400">{formatDate(reply.timestamp)}</span>
                            </div>
                            <div
                              class="markdown-content text-gray-700 dark:text-gray-200 mb-2"
                            >
                              {@html renderMarkdown(reply.content)}
                            </div>
                            <div class="flex items-center gap-4 text-sm">
                              <div class="flex items-center gap-1">
                                <button
                                  on:click={() => handleVote(reply.id, "up")}
                                  class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 {userVotes.find((v) => v.userId === currentUser?.uid && v.messageId === reply.id && v.voteType === 'up') ? 'text-blue-500 dark:text-blue-400' : ''}"
                                >
                                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 3l-7 7h4v7h6v-7h4l-7-7z" />
                                  </svg>
                                </button>
                                <span class="text-gray-600 dark:text-gray-300">{reply.upvotes - reply.downvotes}</span>
                                <button
                                  on:click={() => handleVote(reply.id, "down")}
                                  class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 {userVotes.find((v) => v.userId === currentUser?.uid && v.messageId === reply.id && v.voteType === 'down') ? 'text-blue-500 dark:text-blue-400' : ''}"
                                >
                                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 17l7-7h-4v-7h-6v7H3l7 7z" />
                                  </svg>
                                </button>
                              </div>
                              <button
                                on:click={() => startReply(reply)}
                                class="text-blue-500 dark:text-blue-400 hover:underline"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
  
        {#if messages.length === 0}
          <div
            class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-700 text-center"
          >
            <p class="text-gray-600 dark:text-gray-300">
              Initializing forum messages, please wait...
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </main>
  
  <style>
    /* Markdown content styling */
    .markdown-content :global(h1) {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      color: inherit;
    }
    .markdown-content :global(h2) {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 0.75rem;
      margin-bottom: 0.5rem;
      color: inherit;
    }
    .markdown-content :global(p) {
      margin-bottom: 0.75rem;
    }
    .markdown-content :global(ul) {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .markdown-content :global(ol) {
      list-style-type: decimal;
      padding-left: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .markdown-content :global(a) {
      text-decoration: underline;
      color: #3b82f6;
    }
    .markdown-content :global(a:hover) {
      color: #2563eb;
    }
    .markdown-content :global(blockquote) {
      border-left: 4px solid #e5e7eb;
      padding-left: 1rem;
      color: #6b7280;
      margin-bottom: 0.75rem;
    }
    .dark .markdown-content :global(a) {
      color: #60a5fa;
    }
    .dark .markdown-content :global(a:hover) {
      color: #3b82f6;
    }
    .dark .markdown-content :global(blockquote) {
      border-left-color: #4b5563;
      color: #9ca3af;
    }
  
    /* Animations */
    .transition-all {
      transition: all 0.3s ease;
    }
  </style> -->