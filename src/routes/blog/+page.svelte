<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import { DarkMode } from "flowbite-svelte";
  import { collection, query, orderBy, getDocs, addDoc, Timestamp } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { marked } from "marked";
  import DOMPurify from "dompurify";

  // Blog Post Data
  interface BlogPost {
    id: string;
    title: string;
    content: string;
    timestamp: Date;
    author: string;
  }

  let posts: BlogPost[] = [];
  let currentUser: { uid: string; displayName?: string } | null = null;
  let loading = true;
  let error: string | null = null;
  let formError: string | null = null;
  let formSuccess: string | null = null;

  // Form Data
  let title = "";
  let content = "";

  // Markdown renderer
  const renderer = new marked.Renderer();
  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });

  // Sanitize markdown output
  function renderMarkdown(content: string): string {
    const rawHtml = marked.parse(content) as string; // Ensure synchronous parsing
    return DOMPurify.sanitize(rawHtml);
  }

  // Truncate content for preview
  function truncateContent(content: string, maxLength: number = 200): string {
    // Remove markdown formatting for plain text
    const plainText = content.replace(/[#*`[\]()_-]+/g, "").trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + "...";
  }

  // Fetch posts from Firestore
  async function fetchPosts(): Promise<BlogPost[]> {
    try {
      const postsQuery = query(
        collection(db, "blogPosts"),
        orderBy("timestamp", "desc")
      );
      const postsSnapshot = await getDocs(postsQuery);
      return postsSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        content: doc.data().content,
        timestamp: doc.data().timestamp.toDate(),
        author: doc.data().author,
      }));
    } catch (err) {
      console.error("Error fetching posts:", err);
      throw err;
    }
  }

  // Handle form submission
  async function handleSubmit() {
    formError = null;
    formSuccess = null;

    // Basic validation
    if (!title.trim()) {
      formError = "Title is required";
      return;
    }
    if (!content.trim()) {
      formError = "Content is required";
      return;
    }

    try {
      await addDoc(collection(db, "blogPosts"), {
        title: title.trim(),
        content: content.trim(),
        timestamp: Timestamp.fromDate(new Date()),
        author: currentUser?.displayName || currentUser?.uid || "Anonymous",
      });

      // Reset form
      title = "";
      content = "";
      formSuccess = "Blog post created successfully!";

      // Refresh posts
      posts = await fetchPosts();
    } catch (err) {
      formError = "Failed to create blog post";
      console.error("Error creating post:", err);
    }
  }

  onMount(async () => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("User not authenticated, redirecting to /");
        goto("/");
        return;
      }
      currentUser = { uid: user.uid, displayName: user.displayName ?? undefined };

      try {
        // Fetch posts
        posts = await fetchPosts();
      } catch (err) {
        error = "Failed to load blog posts";
        console.error("Error in onMount:", err);
      } finally {
        loading = false;
      }
    });
  });

  // Format date
  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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
      <!-- Dark Mode Toggle -->
      <div class="absolute top-4 right-4 z-20">
        <DarkMode
          class="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg p-2"
        />
      </div>

      <!-- Blog Header -->
      <div class="mb-8 md:mb-12 text-center px-4">
        <div class="w-full max-w-2xl mx-auto rounded-xl md:rounded-2xl p-6 md:p-8 mb-4 bg-gradient-to-r from-yellow-300 via-blue-200 to-purple-300 dark:from-yellow-700 dark:via-blue-900 dark:to-purple-900 shadow">
          <div class="flex items-center justify-center gap-2 mb-2">
            <span class="text-3xl md:text-4xl">🏆</span>
            <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-100 drop-shadow">Health Blog</h1>
          </div>
          <p class="text-gray-700 dark:text-gray-200 text-base md:text-lg">Insights and tips for a healthier you</p>
        </div>
      </div>

      <!-- Blog Creation Form -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg mb-6 md:mb-8 border border-gray-100 dark:border-gray-700 mx-4 md:mx-0"
      >
        <h2
          class="text-lg md:text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2"
        >
          <svg
            class="w-5 h-5 md:w-6 md:h-6 text-blue-500 dark:text-blue-400"
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
          Create a Blog Post
        </h2>
        {#if formError}
          <div
            class="bg-red-50 dark:bg-red-900/20 p-3 md:p-4 rounded-lg mb-4 flex items-center gap-2 text-red-600 dark:text-red-400"
          >
            <svg
              class="w-4 h-4 md:w-5 md:h-5"
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
            <p class="text-sm md:text-base">{formError}</p>
          </div>
        {/if}
        {#if formSuccess}
          <div
            class="bg-green-50 dark:bg-green-900/20 p-3 md:p-4 rounded-lg mb-4 flex items-center gap-2 text-green-600 dark:text-green-400"
          >
            <svg
              class="w-4 h-4 md:w-5 md:h-5"
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
            <p class="text-sm md:text-base">{formSuccess}</p>
          </div>
        {/if}
        <div class="space-y-4 md:space-y-6">
          <div>
            <label
              for="title"
              class="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center"
            >
              <span>Title</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{title.length}/100</span>
            </label>
            <input
              id="title"
              type="text"
              bind:value={title}
              maxlength="100"
              class="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-base"
              placeholder="Enter post title"
            />
          </div>
          <div>
            <label
              for="content"
              class="block text-sm md:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center"
            >
              <span>Content (Markdown)</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{content.length}/2000</span>
            </label>
            <textarea
              id="content"
              bind:value={content}
              rows="4"
              maxlength="2000"
              class="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-base resize-none"
              placeholder="Write your post in markdown..."
            ></textarea>
            <div class="mt-3 md:mt-4">
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Live Preview</label>
              <div class="prose prose-sm dark:prose-invert max-w-none border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 min-h-[4rem] md:min-h-[3rem] max-h-32 md:max-h-40 overflow-y-auto">
                {@html renderMarkdown(content)}
              </div>
            </div>
          </div>
          <div class="block md:hidden sticky bottom-0 left-0 w-full z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 rounded-b-xl flex justify-end">
            <button
              on:click={handleSubmit}
              class="w-full px-4 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors font-medium"
            >
              Publish Post
            </button>
          </div>
          <div class="hidden md:block">
            <button
              on:click={handleSubmit}
              class="px-6 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors font-medium"
            >
              Publish Post
            </button>
          </div>
        </div>
      </div>

      <!-- Blog Posts -->
      <div class="space-y-6 md:space-y-8 px-4 md:px-0">
        {#each posts as post}
          <article
            class="relative bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border-l-4 border-blue-400 dark:border-blue-600 hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700 group mb-2"
          >
            <div class="flex items-start md:items-center gap-3 mb-3">
              <div class="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm md:text-lg shadow-sm">
                {post.author ? post.author[0].toUpperCase() : 'A'}
              </div>
              <div class="flex-1 min-w-0">
                <h2
                  class="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors mb-1 md:mb-0 line-clamp-2"
                >
                  <a href="/blog/{post.id}">{post.title}</a>
                </h2>
                <div class="flex items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatDate(post.timestamp)}</span>
                  <span>•</span>
                  <span>By {post.author}</span>
                </div>
              </div>
            </div>
            <div class="text-gray-700 dark:text-gray-200 mt-2 max-h-20 md:max-h-28 overflow-hidden relative pr-2">
              <div class="absolute bottom-0 left-0 w-full h-6 md:h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none"></div>
              <div class="prose prose-sm dark:prose-invert max-w-none" >
                {@html renderMarkdown(truncateContent(post.content, 150))}
              </div>
            </div>
            <a
              href="/blog/{post.id}"
              class="inline-flex items-center gap-1 mt-3 md:mt-4 text-blue-500 dark:text-blue-400 hover:underline font-medium group-hover:translate-x-1 transition-transform"
            >
              Read more
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </article>
        {/each}
      </div>

      {#if posts.length === 0}
        <div
          class="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100 dark:border-gray-700 text-center mt-6 md:mt-8 mx-4 md:mx-0"
        >
          <p class="text-gray-600 dark:text-gray-300 text-base md:text-lg">
            No blog posts available. Create one to get started!
          </p>
        </div>
      {/if}
    </div>
  {/if}
</main>

<style>
  /* Markdown content styling (applied to plain text in this case) */
  .text-gray-700 {
    margin-bottom: 1rem;
  }
</style>