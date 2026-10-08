<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { user, isLoadingAuth } from "$lib/stores/authStore";
  import { db } from "$lib/firebase";
  import { collection, doc, getDocs, query, Timestamp, where, writeBatch } from "firebase/firestore";

  interface SavedImage {
    id: string;
    thumbnailDataUrl: string;
    dataUrl?: string;
    contentType: string;
    size: number;
    tag: ImageTag | null;
    uploadedAt: Date;
  }

  type ImageTag = "Gym" | "Food";
  type TagFilter = "All" | ImageTag;
  type SortOption = "newest" | "oldest" | "largest";

  let currentUser: { uid: string } | null = null;
  let images: SavedImage[] = [];
  let selectedImage: SavedImage | null = null;
  let isLoadingPreview = false;
  let isLoading = true;
  let isUploading = false;
  let dragActive = false;
  let errorMessage = "";
  let successMessage = "";
  let uploadStatus = "";
  let selectedTag: ImageTag = "Gym";
  let activeTagFilter: TagFilter = "All";
  let sortOption: SortOption = "newest";
  let deletingImageId = "";
  let previewObjectUrl = "";
  let fileInput: HTMLInputElement;
  let previewUrls: string[] = [];

  const unsubscribe = user.subscribe((value) => {
    currentUser = value ? { uid: value.uid } : null;
  });

  onMount(() => {
    if (!browser) return;

    const unsubscribeLoading = isLoadingAuth.subscribe((loading) => {
      if (!loading && !currentUser) {
        goto("/");
      }
    });

    return unsubscribeLoading;
  });

  onDestroy(() => {
    unsubscribe();
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  });

  $: if (currentUser) {
    loadImages(currentUser.uid);
  }

  // Keep each encoded chunk comfortably below Firestore's 1 MiB document limit.
  const chunkSize = 700_000;
  const maxImageDimension = 1600;
  const thumbnailDimension = 480;
  const webpQuality = 0.78;

  async function loadImages(uid: string) {
    isLoading = true;
    errorMessage = "";

    try {
      const snapshot = await getDocs(
        query(collection(db, "images"), where("userId", "==", uid))
      );

      images = (await Promise.all(snapshot.docs.map(async (imageDoc) => {
          const data = imageDoc.data();
          const thumbnailChunks = await readChunks(imageDoc.id, "thumbnailChunks");
          const fallbackChunks = thumbnailChunks.length
            ? thumbnailChunks
            : await readChunks(imageDoc.id, "chunks");
          const timestamp = data.uploadedAt instanceof Timestamp
            ? data.uploadedAt.toDate()
            : new Date(data.uploadedAt || Date.now());

          return {
            id: imageDoc.id,
            thumbnailDataUrl: `data:${data.thumbnailContentType || data.contentType};base64,${fallbackChunks}`,
            contentType: data.contentType as string,
            size: Number(data.size || 0),
            tag: data.tag === "Gym" || data.tag === "Food" ? data.tag : null,
            uploadedAt: timestamp
          };
        })))
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    } catch (error) {
      console.error("Failed to load saved images:", error);
      errorMessage = "We couldn't load your images. Please try again.";
    } finally {
      isLoading = false;
    }

    async function readChunks(imageId: string, collectionName: "chunks" | "thumbnailChunks") {
      const chunksSnapshot = await getDocs(
        query(collection(db, "images", imageId, collectionName))
      );
      return chunksSnapshot.docs
        .sort((a, b) => Number(a.data().index || 0) - Number(b.data().index || 0))
        .map((chunk) => chunk.data().data as string)
        .join("");
    }

    async function openPreview(image: SavedImage) {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = "";
      }
      selectedImage = { ...image, dataUrl: image.thumbnailDataUrl };
      if (image.dataUrl) {
        selectedImage = image;
        return;
      }

      isLoadingPreview = true;
      try {
        const encodedImage = await readChunks(image.id, "chunks");
        previewObjectUrl = base64ToObjectUrl(encodedImage, image.contentType);
        selectedImage = {
          ...image,
          dataUrl: previewObjectUrl
        };
      } catch (error) {
        console.error("Failed to load full image:", error);
        errorMessage = "We couldn't load the full image. Please try again.";
      } finally {
        isLoadingPreview = false;
      }

      function base64ToObjectUrl(encodedImage: string, contentType: string) {
        const binary = atob(encodedImage);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return URL.createObjectURL(new Blob([bytes], { type: contentType }));
      }

      function closePreview() {
        selectedImage = null;
        isLoadingPreview = false;
        if (previewObjectUrl) {
          URL.revokeObjectURL(previewObjectUrl);
          previewObjectUrl = "";
        }
      }
    }
  }

  function handleFileInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    if (target.files) {
      uploadImages(Array.from(target.files));
    }
    target.value = "";
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;

    if (event.dataTransfer?.files.length) {
      uploadImages(Array.from(event.dataTransfer.files));
    }
  }

  async function uploadImages(files: File[]) {
    if (!currentUser || isUploading) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      errorMessage = "Only image files can be uploaded.";
      return;
    }
    if (!imageFiles.length) return;

    isUploading = true;
    errorMessage = "";
    successMessage = "";
    uploadStatus = "";
    previewUrls = imageFiles.map((file) => URL.createObjectURL(file));

    try {
      for (let fileIndex = 0; fileIndex < imageFiles.length; fileIndex += 1) {
        const file = imageFiles[fileIndex];
        uploadStatus = `Optimizing image ${fileIndex + 1} of ${imageFiles.length}...`;
        const compressed = await compressImage(file);
        const thumbnail = await compressImage(file, thumbnailDimension);
        const dataUrl = compressed.dataUrl;
        const encodedImage = dataUrl.split(",", 2)[1];
        const encodedThumbnail = thumbnail.dataUrl.split(",", 2)[1];
        const imageDocument = doc(collection(db, "images"));
        const batch = writeBatch(db);

        batch.set(imageDocument, {
          userId: currentUser.uid,
          contentType: compressed.contentType,
          thumbnailContentType: thumbnail.contentType,
          size: file.size,
          storedSize: compressed.size,
          thumbnailSize: thumbnail.size,
          tag: selectedTag,
          uploadedAt: Timestamp.now(),
          chunkCount: Math.ceil(encodedImage.length / chunkSize),
          thumbnailChunkCount: Math.ceil(encodedThumbnail.length / chunkSize)
        });

        const chunkCollection = collection(db, "images", imageDocument.id, "chunks");
        for (let index = 0; index < encodedImage.length; index += chunkSize) {
          const chunkDocument = doc(chunkCollection);
          batch.set(chunkDocument, {
            index: Math.floor(index / chunkSize),
            data: encodedImage.slice(index, index + chunkSize)
          });
        }
        const thumbnailCollection = collection(db, "images", imageDocument.id, "thumbnailChunks");
        for (let index = 0; index < encodedThumbnail.length; index += chunkSize) {
          const thumbnailDocument = doc(thumbnailCollection);
          batch.set(thumbnailDocument, {
            index: Math.floor(index / chunkSize),
            data: encodedThumbnail.slice(index, index + chunkSize)
          });
        }

        uploadStatus = `Saving image ${fileIndex + 1} of ${imageFiles.length}...`;
        await batch.commit();
      }

      await loadImages(currentUser.uid);
      successMessage = imageFiles.length === 1
        ? "Your image was saved."
        : `${imageFiles.length} images were saved.`;
    } catch (error) {
      console.error("Failed to upload images:", error);
      errorMessage = "The upload failed. Please check your connection and try again.";
    } finally {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls = [];
      uploadStatus = "";
      isUploading = false;
    }
  }

  async function deleteImage(image: SavedImage) {
    if (!currentUser || deletingImageId) return;
    if (!window.confirm("Delete this image? This cannot be undone.")) return;

    deletingImageId = image.id;
    errorMessage = "";
    successMessage = "";

    try {
      const [chunksSnapshot, thumbnailChunksSnapshot] = await Promise.all([
        getDocs(collection(db, "images", image.id, "chunks")),
        getDocs(collection(db, "images", image.id, "thumbnailChunks"))
      ]);
      const operations = [
        ...chunksSnapshot.docs.map((chunkDocument) => ({
          path: chunkDocument.ref,
          type: "chunk" as const
        })),
        ...thumbnailChunksSnapshot.docs.map((chunkDocument) => ({
          path: chunkDocument.ref,
          type: "thumbnail" as const
        })),
        { path: doc(db, "images", image.id), type: "image" as const }
      ];

      for (let index = 0; index < operations.length; index += 450) {
        const batch = writeBatch(db);
        operations.slice(index, index + 450).forEach((operation) => batch.delete(operation.path));
        await batch.commit();
      }

      images = images.filter((savedImage) => savedImage.id !== image.id);
      if (selectedImage?.id === image.id) {
        closePreview();
      }
      successMessage = "Image deleted.";
    } catch (error) {
      console.error("Failed to delete image:", error);
      errorMessage = "We couldn't delete that image. Please try again.";
    } finally {
      deletingImageId = "";
    }
  }

  async function compressImage(file: File, maximumDimension = maxImageDimension): Promise<{ dataUrl: string; contentType: string; size: number }> {
    const sourceUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
        element.src = sourceUrl;
      });

      const scale = Math.min(1, maximumDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Your browser could not prepare this image.");
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error(`Unable to compress ${file.name}.`)),
          "image/webp",
          webpQuality
        );
      });
      const dataUrl = await blobToDataUrl(blob);

      return {
        dataUrl,
        contentType: "image/webp",
        size: blob.size
      };
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The compressed image could not be read."));
      reader.onerror = () => reject(reader.error ?? new Error("The compressed image could not be read."));
      reader.readAsDataURL(blob);
    });
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function formatSize(bytes: number) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
  }

  function tagClasses(tag: ImageTag | null) {
    return tag === "Gym"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
  }

  $: filteredImages = images
    .filter((image) => activeTagFilter === "All" || image.tag === activeTagFilter)
    .sort((a, b) => {
      if (sortOption === "oldest") return a.uploadedAt.getTime() - b.uploadedAt.getTime();
      if (sortOption === "largest") return b.size - a.size;
      return b.uploadedAt.getTime() - a.uploadedAt.getTime();
    });
</script>

<svelte:head>
  <title>My Images — WtManagement</title>
  <meta name="description" content="Save and revisit your personal image collection." />
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 dark:bg-gray-900 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-6xl">
    <div class="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <span class="h-2 w-2 rounded-full bg-blue-500"></span>
          Personal gallery
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Your saved images
        </h1>
        <p class="mt-2 max-w-xl text-slate-600 dark:text-gray-400">
          Keep your progress, inspiration, and important moments together in one beautiful place.
        </p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <span class="font-semibold text-slate-900 dark:text-white">{filteredImages.length}</span>
        <span class="text-slate-500 dark:text-gray-400"> {filteredImages.length === 1 ? "image" : "images"} shown</span>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium text-slate-700 dark:text-gray-300">Tag new uploads:</span>
      {#each ["Gym", "Food"] as tag}
        <button
          type="button"
          class:opacity-50={selectedTag !== tag}
          class={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${tagClasses(tag as ImageTag)}`}
          aria-pressed={selectedTag === tag}
          onclick={() => selectedTag = tag as ImageTag}
        >
          {tag}
        </button>
      {/each}
    </div>

    <div
      role="button"
      tabindex="0"
      aria-label="Upload images"
      class:border-blue-500={dragActive}
      class:bg-blue-50={dragActive}
      class="group relative mb-10 overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 sm:p-12"
      ondragover={(event) => { event.preventDefault(); dragActive = true; }}
      ondragleave={() => dragActive = false}
      ondrop={handleDrop}
      onclick={() => fileInput?.click()}
      onkeydown={(event) => { if (event.key === "Enter" || event.key === " ") fileInput?.click(); }}
    >
      <input bind:this={fileInput} class="hidden" type="file" accept="image/*" multiple onchange={handleFileInput} />
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
        <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V8.25A2.25 2.25 0 015.25 6h3.879a2.25 2.25 0 001.59-.659l.621-.621A2.25 2.25 0 0112.93 4h.82a2.25 2.25 0 011.591.659l.621.621a2.25 2.25 0 001.59.659h.198A2.25 2.25 0 0120 8.25v8.25A2.25 2.25 0 0117.75 18.75h-12A2.25 2.25 0 013.5 16.5z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 14.25l2.25-2.25 1.5 1.5 2.25-2.25 2.25 2.25M15 9.75h.008v.008H15V9.75z" />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">{isUploading ? uploadStatus : "Drop images here"}</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-gray-400">or click to browse from your device · JPG, PNG, GIF, WEBP and more</p>
      {#if isUploading}
        <div class="mx-auto mt-5 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-gray-700">
          <div class="h-full w-1/2 animate-pulse rounded-full bg-blue-500"></div>
        </div>
      {/if}
    </div>

    {#if errorMessage}
      <div class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{errorMessage}</div>
    {/if}
    {#if successMessage}
      <div class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">{successMessage}</div>
    {/if}

    <div class="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <span class="mr-1 text-sm font-semibold text-slate-700 dark:text-gray-300">Show:</span>
        {#each ["All", "Gym", "Food"] as filter}
          <button
            type="button"
            class:shadow-sm={activeTagFilter === filter}
            class:opacity-50={activeTagFilter !== filter}
            class={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === "Gym"
                ? tagClasses("Gym")
                : filter === "Food"
                  ? tagClasses("Food")
                  : "bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200"
            }`}
            aria-pressed={activeTagFilter === filter}
            onclick={() => activeTagFilter = filter as TagFilter}
          >
            {filter}
          </button>
        {/each}
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
        <span class="font-semibold">Sort:</span>
        <select bind:value={sortOption} class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="largest">Largest first</option>
        </select>
      </label>
    </div>

    {#if isLoading}
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each [1, 2, 3] as _}
          <div class="h-80 animate-pulse rounded-3xl bg-slate-200 dark:bg-gray-800"></div>
        {/each}
      </div>
    {:else if images.length === 0}
      <div class="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-800/60">
        <div class="mx-auto mb-4 text-5xl">✦</div>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">Your gallery is ready</h2>
        <p class="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-gray-400">Upload your first image above and it will stay safely connected to your account.</p>
      </div>
    {:else if filteredImages.length === 0}
      <div class="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-800/60">
        <div class="mx-auto mb-4 text-5xl">⌁</div>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-white">No matching images</h2>
        <p class="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-gray-400">Try another tag filter to view more of your gallery.</p>
      </div>
    {:else}
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredImages as image}
          <div class="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <button class="block w-full text-left" aria-label="Open image preview" onclick={() => openPreview(image)}>
              <div class="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-gray-900">
                <img src={image.thumbnailDataUrl} alt={image.tag ? `${image.tag} image` : "Saved image"} loading="lazy" decoding="async" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div class="absolute inset-0 flex items-center justify-center bg-slate-950/0 transition group-hover:bg-slate-950/35">
                  <span class="scale-75 rounded-full bg-white/90 p-3 text-slate-900 opacity-0 shadow-lg transition group-hover:scale-100 group-hover:opacity-100">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </span>
                </div>
              </div>
              <div class="p-4 pb-2">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-semibold text-slate-800 dark:text-gray-100">{image.tag || "Uncategorized"}</p>
                  {#if image.tag}
                    <span class={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${tagClasses(image.tag)}`}>{image.tag}</span>
                  {/if}
                </div>
                <div class="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-gray-400">
                  <span>{formatDate(image.uploadedAt)}</span>
                  <span>{formatSize(image.size)}</span>
                </div>
              </div>
            </button>
            <div class="flex justify-end px-4 pb-4">
              <button
                class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                disabled={deletingImageId === image.id}
                onclick={() => deleteImage(image)}
              >
                {#if deletingImageId === image.id}
                  <span class="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600"></span>
                  Deleting...
                {:else}
                  <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12m-10 0v11a1 1 0 001 1h6a1 1 0 001-1V7m-7 0V5a1 1 0 011-1h2a1 1 0 011 1v2m-6 0h10" /></svg>
                  Delete
                {/if}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if selectedImage}
  <div class="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/90 p-3 backdrop-blur-sm sm:p-4" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) closePreview(); }}>
    <div class="relative w-full max-w-5xl py-8 sm:py-4">
      <button class="absolute right-0 top-0 z-10 rounded-full bg-black/55 p-3 text-white shadow-lg transition hover:bg-black/75 sm:-right-12 sm:top-0 sm:bg-white/10" aria-label="Close image preview" onclick={closePreview}>
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <div class="flex max-h-[78vh] max-w-full items-center justify-center overflow-hidden rounded-2xl bg-black/20 shadow-2xl">
        <img
          src={selectedImage.dataUrl || selectedImage.thumbnailDataUrl}
          alt={selectedImage.tag ? `${selectedImage.tag} image` : "Saved image"}
          decoding="async"
          class="max-h-[78vh] max-w-[calc(100vw-2rem)] object-contain sm:max-w-[calc(100vw-6rem)]"
        />
        {#if isLoadingPreview}
          <span class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1.5 text-xs text-white/90">
            Loading full image...
          </span>
        {/if}
      </div>
      <div class="mt-3 flex items-center justify-between gap-4 text-sm text-white">
        <span class="flex min-w-0 items-center gap-2">
          <span>{selectedImage.tag || "Uncategorized"}</span>
          {#if selectedImage.tag}
            <span class={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${tagClasses(selectedImage.tag)}`}>{selectedImage.tag}</span>
          {/if}
        </span>
        <span class="shrink-0 text-white/65">{formatDate(selectedImage.uploadedAt)}</span>
      </div>
    </div>
  </div>
{/if}
