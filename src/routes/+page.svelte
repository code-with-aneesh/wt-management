<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { user } from "$lib/stores/authStore";
  import { loginWithGoogle } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let currentUser: any;
  const unsubscribe = user.subscribe((u) => {
    currentUser = u;
    if (currentUser) goto("/dashboard");
  });
  onDestroy(unsubscribe);

  let openFaq: number | null = null;

  const features = [
    { title: "AI Health Insights", desc: "Personalized recommendations powered by advanced machine learning tailored to your biology." },
    { title: "Secure Tracking", desc: "End-to-end encryption ensures your health data remains private and secure across all devices." },
    { title: "Cross-Device Sync", desc: "Seamlessly access your health data across all your devices in real-time with zero friction." },
    { title: "Smart Analytics", desc: "Comprehensive dashboards with interactive charts to visualize your progress over time." },
    { title: "Community Forum", desc: "Connect with like-minded individuals, share progress, and stay motivated together." },
    { title: "AI Chatbot", desc: "Get instant answers to your health and fitness questions from our intelligent FitBot assistant." },
  ];

  const testimonials = [
    { name: "Sarah Johnson", role: "Fitness Coach", text: "This platform transformed how I track my clients' progress. The AI-driven analytics are incredible.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face" },
    { name: "Michael Chen", role: "Tech Entrepreneur", text: "Finally a health app that actually understands user needs. The predictive insights are genuinely helpful.", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" },
    { name: "Emily Rodriguez", role: "Nutritionist", text: "I recommend this to all my clients. The BMR and calorie tracking is the most accurate I've seen.", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" },
  ];

  const faqs = [
    { q: "Is my health data secure?", a: "Absolutely. We use end-to-end encryption and comply with GDPR and HIPAA standards. Your data never leaves your control." },
    { q: "Can I track multiple metrics?", a: "Yes! Track weight, BMI, BMR, body fat, gym attendance, and more. All visualized in interactive charts." },
    { q: "Does it work on mobile?", a: "The web app is fully responsive and works seamlessly on any device. A native mobile app is coming soon." },
  ];
</script>

<svelte:head>
  <title>HealthAI — Smarter Health, Powered by AI</title>
  <meta name="description" content="Transform your wellness journey with cutting-edge AI analytics, smart tracking, and personalized health insights." />
</svelte:head>

<div class="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
  <section class="relative min-h-[90vh] flex items-center overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950"></div>
    <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-[120px] -translate-y-1/2"></div>
    <div class="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-[120px] translate-y-1/3"></div>
    <div class="relative w-full max-w-6xl mx-auto px-6 py-20 md:py-32">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium mb-6 border border-blue-200 dark:border-blue-800">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          AI-Powered Health Analytics
        </div>
        <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-6">
          <span class="text-gray-900 dark:text-white">Smarter Health,</span><br />
          <span class="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Powered by AI</span>
        </h1>
        <p class="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-xl leading-relaxed">
          Transform your wellness journey with cutting-edge artificial intelligence. Track, analyze, and optimize every aspect of your health with precision.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onclick={loginWithGoogle}
            class="inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-base sm:text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Get Started Free
          </button>
          <a href="#features" class="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-base sm:text-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-300">
            Learn More
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </a>
        </div>
        <div class="flex items-center gap-3 sm:gap-4 mt-10 text-sm text-gray-500">
          <div class="flex -space-x-2">
            {#each ['1494790108377-be9c29b29330','1507003211169-0a1dd7228f2d','1438761681033-6461ffad8d80','1472099645785-5658abf4ff4e'] as photo}
              <img src="https://images.unsplash.com/photo-{photo}?w=40&h=40&fit=crop&crop=face" alt="" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white dark:border-gray-950" />
            {/each}
          </div>
          <span>Trusted by <strong class="text-gray-900 dark:text-white">50,000+</strong> users</span>
        </div>
      </div>
    </div>
  </section>

  <section id="features" class="py-20 sm:py-28 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-14 sm:mb-20">
        <p class="text-xs sm:text-sm font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-3">Features</p>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">Everything you need to thrive</h2>
        <p class="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Comprehensive tools designed to give you complete control over your health and fitness journey.</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {#each features as f, i}
          <div class="group p-6 sm:p-8 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg transition-all duration-300" style="transition-delay: {i * 80}ms">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                {#if i === 0}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                {:else if i === 1}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                {:else if i === 2}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                {:else if i === 3}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                {:else if i === 4}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                {:else}
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                {/if}
              </svg>
            </div>
            <h3 class="text-base sm:text-lg font-semibold mb-2">{f.title}</h3>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-20 sm:py-28 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
        <div>
          <div class="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-1">98%</div>
          <div class="text-blue-200 text-sm sm:text-base">User Satisfaction</div>
        </div>
        <div>
          <div class="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-1">50K+</div>
          <div class="text-blue-200 text-sm sm:text-base">Active Users</div>
        </div>
        <div>
          <div class="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-1">24/7</div>
          <div class="text-blue-200 text-sm sm:text-base">AI Support</div>
        </div>
      </div>
    </div>
  </section>

  <section id="testimonials" class="py-20 sm:py-28 px-6">
    <div class="max-w-6xl mx-auto">
      <div class="text-center mb-14 sm:mb-20">
        <p class="text-xs sm:text-sm font-semibold tracking-widest uppercase text-purple-600 dark:text-purple-400 mb-3">Testimonials</p>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">Loved by health professionals</h2>
        <p class="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Hear from the people who use HealthAI every day.</p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each testimonials as t, i}
          <div class="p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300" style="transition-delay: {i * 100}ms">
            <div class="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
              <img src={t.photo} alt={t.name} class="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-purple-200 dark:ring-purple-800" />
              <div>
                <div class="font-semibold text-sm sm:text-base">{t.name}</div>
                <div class="text-xs sm:text-sm text-gray-500">{t.role}</div>
              </div>
            </div>
            <div class="flex gap-0.5 mb-3 sm:mb-4">
              {#each [1,2,3,4,5] as _}
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {/each}
            </div>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">"{t.text}"</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-20 sm:py-28 px-6 bg-gray-50 dark:bg-gray-900/50">
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-14">
        <p class="text-xs sm:text-sm font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-3">FAQ</p>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">Got questions?</h2>
        <p class="text-base sm:text-lg text-gray-600 dark:text-gray-400">Everything you need to know about HealthAI.</p>
      </div>
      <div class="space-y-3">
        {#each faqs as faq, i}
          <div class="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button
              onclick={() => openFaq = openFaq === i ? null : i}
              class="flex items-center justify-between w-full px-6 sm:px-8 py-4 sm:py-5 text-left font-semibold text-sm sm:text-base hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span>{faq.q}</span>
              <svg
                class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-300 shrink-0"
                class:rotate-45={openFaq === i}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {#if openFaq === i}
              <div class="px-6 sm:px-8 pb-4 sm:pb-5 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                {faq.a}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-20 sm:py-28 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
    <div class="max-w-2xl mx-auto text-center text-white">
      <h2 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">Ready to transform your health?</h2>
      <p class="text-base sm:text-lg text-blue-200 mb-8 max-w-lg mx-auto">Join thousands of users who have taken control of their wellness journey with AI-powered insights.</p>
      <button
        onclick={loginWithGoogle}
        class="inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-white text-gray-900 rounded-xl font-semibold text-base sm:text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Get Started Free
      </button>
    </div>
  </section>

  <footer class="py-12 sm:py-16 px-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
    <div class="max-w-6xl mx-auto">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10">
        <div class="sm:col-span-2 lg:col-span-2">
          <div class="text-lg font-bold mb-3">
            <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">HealthAI</span>
          </div>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">Empowering individuals to take control of their health through the power of artificial intelligence and data-driven insights.</p>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-3">Product</h4>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features" class="block hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Features</a>
            <a href="/blog" class="block hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Blog</a>
            <a href="/about" class="block hover:text-gray-900 dark:hover:text-gray-200 transition-colors">About</a>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-3">Support</h4>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <a href="mailto:anesh.angane@gmail.com" class="block hover:text-gray-900 dark:hover:text-gray-200 transition-colors">Contact</a>
            <a href="https://github.com/code-with-aneesh/wt-management/issues" target="_blank" rel="noopener" class="block hover:text-gray-900 dark:hover:text-gray-200 transition-colors">GitHub Issues</a>
          </div>
        </div>
      </div>
      <div class="pt-6 border-t border-gray-200 dark:border-gray-800 text-center text-xs sm:text-sm text-gray-500">
        &copy; {new Date().getFullYear()} HealthAI. All rights reserved.
      </div>
    </div>
  </footer>
</div>
