<script lang="ts">
  import { onMount } from "svelte";
  import { db, auth } from "$lib/firebase";
  import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc, increment, Timestamp } from "firebase/firestore";
  import { onAuthStateChanged } from "firebase/auth";
  import { goto } from "$app/navigation";
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { DarkMode } from "flowbite-svelte";
  import { page } from "$app/stores";
  import { get } from "svelte/store";

  interface BlogPost {
    id: string;
    title: string;
    content: string;
    timestamp: Date;
    author: string;
  }

  interface Comment {
    id: string;
    content: string;
    author: string;
    timestamp: Date;
    parentId: string | null;
    upvotes: number;
    downvotes: number;
    userVotes: { [uid: string]: "upvote" | "downvote" };
    replies?: Comment[];
  }

  let post: BlogPost | null = null;
  let comments: Comment[] = [];
  let loading = true;
  let error: string | null = null;
  let currentUser: { uid: string; displayName?: string } | null = null;
  let commentContent = "";
  let replyContent: { [commentId: string]: string } = {};
  let replyOpen: { [commentId: string]: boolean } = {};
  let formError: string | null = null;
  let formSuccess: string | null = null;

  const renderer = new marked.Renderer();
  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });

  function renderMarkdown(content: string): string {
    const rawHtml = marked.parse(content) as string;
    return DOMPurify.sanitize(rawHtml);
  }

  async function fetchPost(postId: string): Promise<BlogPost | null> {
    try {
      const postRef = doc(db, "blogPosts", postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        return {
          id: postSnap.id,
          title: postSnap.data().title,
          content: postSnap.data().content,
          timestamp: postSnap.data().timestamp.toDate(),
          author: postSnap.data().author,
        };
      } else {
        throw new Error("Post not found");
      }
    } catch (err) {
      console.error("Error fetching post:", err);
      throw new Error("Failed to fetch blog post");
    }
  }

  async function fetchComments(postId: string): Promise<Comment[]> {
    try {
      const commentsQuery = query(
        collection(db, `blogPosts/${postId}/comments`),
        orderBy("timestamp", "desc")
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const allComments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        content: doc.data().content,
        author: doc.data().author,
        timestamp: doc.data().timestamp.toDate(),
        parentId: doc.data().parentId || null,
        upvotes: doc.data().upvotes || 0,
        downvotes: doc.data().downvotes || 0,
        userVotes: doc.data().userVotes || {},
      }));

      const topLevelComments: Comment[] = [];
      const commentMap: { [id: string]: Comment } = {};

      allComments.forEach((comment) => {
        commentMap[comment.id] = { ...comment, replies: [] };
      });

      allComments.forEach((comment) => {
        if (comment.parentId) {
          commentMap[comment.parentId]?.replies?.push(commentMap[comment.id]);
        } else {
          topLevelComments.push(commentMap[comment.id]);
        }
      });

      return topLevelComments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } catch (err) {
      console.error("Error fetching comments:", err);
      return [];
    }
  }

  async function handleCommentSubmit() {
    formError = null;
    formSuccess = null;

    if (!currentUser) {
      formError = "You must be logged in to comment";
      return;
    }

    if (!commentContent.trim()) {
      formError = "Comment cannot be empty";
      return;
    }

    try {
      const postId = get(page).params.id;
      await addDoc(collection(db, `blogPosts/${postId}/comments`), {
        content: commentContent.trim(),
        author: currentUser.displayName || currentUser.uid || "Anonymous",
        timestamp: Timestamp.fromDate(new Date()),
        parentId: null,
        upvotes: 0,
        downvotes: 0,
        userVotes: {},
      });

      commentContent = "";
      formSuccess = "Comment posted successfully!";
      comments = await fetchComments(postId);
    } catch (err) {
      formError = "Failed to post comment";
      console.error("Error posting comment:", err);
    }
  }

  async function handleReplySubmit(parentId: string) {
    formError = null;
    formSuccess = null;

    if (!currentUser) {
      formError = "You must be logged in to reply";
      return;
    }

    if (!replyContent[parentId]?.trim()) {
      formError = "Reply cannot be empty";
      return;
    }

    try {
      const postId = get(page).params.id;
      await addDoc(collection(db, `blogPosts/${postId}/comments`), {
        content: replyContent[parentId].trim(),
        author: currentUser.displayName || currentUser.uid || "Anonymous",
        timestamp: Timestamp.fromDate(new Date()),
        parentId,
        upvotes: 0,
        downvotes: 0,
        userVotes: {},
      });

      replyContent[parentId] = "";
      replyOpen[parentId] = false;
      replyContent = { ...replyContent };
      replyOpen = { ...replyOpen };
      formSuccess = "Reply posted successfully!";
      comments = await fetchComments(postId);
    } catch (err) {
      formError = "Failed to post reply";
      console.error("Error posting reply:", err);
    }
  }

  async function handleVote(commentId: string, voteType: "upvote" | "downvote") {
    if (!currentUser) {
      formError = "You must be logged in to vote";
      return;
    }

    const postId = get(page).params.id;
    const commentRef = doc(db, `blogPosts/${postId}/comments`, commentId);
    const comment = comments.find((c) => c.id === commentId) || comments.flatMap((c) => c.replies || []).find((c) => c.id === commentId);

    if (!comment) return;

    const userVote = comment.userVotes[currentUser.uid];
    const updates: { [key: string]: any } = { [`userVotes.${currentUser.uid}`]: voteType };

    if (userVote === voteType) {
      updates[`userVotes.${currentUser.uid}`] = null;
      updates[voteType + "s"] = increment(-1);
    } else {
      if (userVote) {
        updates[userVote + "s"] = increment(-1);
      }
      updates[voteType + "s"] = increment(1);
    }

    try {
      await updateDoc(commentRef, updates);
      comments = await fetchComments(postId);
    } catch (err) {
      console.error("Error voting:", err);
      formError = "Failed to record vote";
    }
  }

  function toggleReplyForm(commentId: string) {
    replyOpen[commentId] = !replyOpen[commentId];
    if (!replyOpen[commentId]) {
      replyContent[commentId] = "";
    } else {
      replyContent[commentId] = replyContent[commentId] || "";
    }
    replyOpen = { ...replyOpen };
    replyContent = { ...replyContent };
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("User not authenticated, redirecting to /");
        goto("/");
        return;
      }

      currentUser = { uid: user.uid, displayName: user.displayName ?? undefined };
      const postId = get(page).params.id;

      if (!postId) {
        error = "Invalid blog post ID.";
        loading = false;
        return;
      }

      try {
        post = await fetchPost(postId);
        comments = await fetchComments(postId);
      } catch (err) {
        error = err instanceof Error ? err.message : "Failed to load blog post";
      } finally {
        loading = false;
      }
    });
  });
</script>

<main class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
  {#if loading}
    <div class="flex justify-center items-center h-screen">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
    </div>
  {:else if error}
    <div class="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-4 sm:p-6 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30">
      <div class="flex items-center gap-3 text-red-600 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-base sm:text-lg font-medium">{error}</p>
      </div>
    </div>
  {:else if post}
    <div class="max-w-4xl mx-auto">
      <div class="fixed top-4 right-4 sm:static sm:top-auto sm:right-auto">
        <DarkMode class="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg p-2" />
      </div>

      <article class="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 mb-6 sm:mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">{post.title}</h1>
        <div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
          <span>{formatDate(post.timestamp)}</span>
          <span class="hidden sm:inline">•</span>
          <span>By {post.author}</span>
        </div>
        <div class="markdown-content text-gray-700 dark:text-gray-200 text-sm sm:text-base">
          {@html renderMarkdown(post.content)}
        </div>
        <a href="/blog" class="inline-block mt-4 sm:mt-6 text-blue-500 dark:text-blue-400 hover:underline font-medium text-sm sm:text-base">
          ← Back to Blog
        </a>
      </article>

      <section class="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg sm:text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-4.185A9.863 9.863 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Comments
        </h2>

        <div class="mb-6">
          {#if formError}
            <div class="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-lg mb-4 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{formError}</p>
            </div>
          {/if}
          {#if formSuccess}
            <div class="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-lg mb-4 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <p>{formSuccess}</p>
            </div>
          {/if}
          <textarea
            bind:value={commentContent}
            rows="4"
            class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm sm:text-base"
            placeholder="Write your comment in markdown..."
          ></textarea>
          <button
            on:click={handleCommentSubmit}
            class="mt-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Post Comment
          </button>
        </div>

        {#if comments.length === 0}
          <p class="text-gray-600 dark:text-gray-300 text-sm sm:text-base">No comments yet. Be the first to comment!</p>
        {:else}
          {#each comments as comment}
            <div class="mb-4 sm:mb-6 border-l-4 border-gray-200 dark:border-gray-600 pl-3 sm:pl-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium">By {comment.author}</span>
                  <span class="sm:hidden">•</span>
                  <span>{formatDate(comment.timestamp)}</span>
                </div>
                <div class="flex items-center gap-2 mt-1 sm:mt-0">
                  <button
                    on:click={() => handleVote(comment.id, "upvote")}
                    class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1"
                    disabled={!currentUser}
                  >
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill={comment.userVotes[currentUser?.uid || ""] === "upvote" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                    <span>{comment.upvotes}</span>
                  </button>
                  <button
                    on:click={() => handleVote(comment.id, "downvote")}
                    class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
                    disabled={!currentUser}
                  >
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill={comment.userVotes[currentUser?.uid || ""] === "downvote" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>{comment.downvotes}</span>
                  </button>
                </div>
              </div>
              <div class="markdown-content text-gray-700 dark:text-gray-200 text-sm sm:text-base mb-2">
                {@html renderMarkdown(comment.content)}
              </div>
              <button
                on:click={() => toggleReplyForm(comment.id)}
                class="text-blue-500 dark:text-blue-400 hover:underline text-xs sm:text-sm"
              >
                {replyOpen[comment.id] ? "Cancel Reply" : "Reply"}
              </button>

              {#if replyOpen[comment.id]}
                <div class="mt-3 sm:mt-4 ml-3 sm:ml-6">
                  <textarea
                    bind:value={replyContent[comment.id]}
                    rows="3"
                    class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm sm:text-base"
                    placeholder="Write your reply in markdown..."
                  ></textarea>
                  <button
                    on:click={() => handleReplySubmit(comment.id)}
                    class="mt-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Post Reply
                  </button>
                </div>
              {/if}

              {#if comment.replies?.length}
                <div class="mt-3 sm:mt-4 ml-3 sm:ml-6 space-y-3 sm:space-y-4">
                  {#each comment.replies as reply}
                    <div class="border-l-2 border-gray-200 dark:border-gray-600 pl-3 sm:pl-4">
                      <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-medium">By {reply.author}</span>
                          <span class="sm:hidden">•</span>
                          <span>{formatDate(reply.timestamp)}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-1 sm:mt-0">
                          <button
                            on:click={() => handleVote(reply.id, "upvote")}
                            class="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1"
                            disabled={!currentUser}
                          >
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill={reply.userVotes[currentUser?.uid || ""] === "upvote" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                            </svg>
                            <span>{reply.upvotes}</span>
                          </button>
                          <button
                            on:click={() => handleVote(reply.id, "downvote")}
                            class="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1"
                            disabled={!currentUser}
                          >
                            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill={reply.userVotes[currentUser?.uid || ""] === "downvote" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                            <span>{reply.downvotes}</span>
                          </button>
                        </div>
                      </div>
                      <div class="markdown-content text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                        {@html renderMarkdown(reply.content)}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  .markdown-content :global(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 1.25rem;
    margin-bottom: 0.75rem;
    color: inherit;
  }

  .markdown-content :global(h2) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: inherit;
  }

  .markdown-content :global(p) {
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(ul) {
    list-style-type: disc;
    padding-left: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(ol) {
    list-style-type: decimal;
    padding-left: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(a) {
    text-decoration: underline;
    color: #3b82f6;
  }

  .markdown-content :global(a:hover) {
    color: #2563eb;
  }


  @media (max-width: 640px) {
    .markdown-content :global(h1) {
      font-size: 1.25rem;
    }

    .markdown-content :global(h2) {
      font-size: 1.125rem;
    }
  }
</style>
