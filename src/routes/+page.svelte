<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade, fly, slide } from "svelte/transition";
  import { user } from "$lib/stores/authStore";
  import { loginWithGoogle } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";

  let mainContainer: HTMLElement;
  let currentUser: any;

  const unsubscribe = user.subscribe((u) => {
    currentUser = u;
    if (currentUser) goto("/dashboard");
  });

  onMount(() => {
    if (browser) {
      // Parallax effect with color animation
      const handleScroll = () => {
        const scrollY = window.scrollY;
        document.querySelectorAll('.parallax-bg').forEach((el) => {
          const elem = el as HTMLElement;
          elem.style.transform = `translateY(${scrollY * 0.3}px)`;
          elem.style.background = `linear-gradient(135deg, #2563eb ${scrollY / 20}%, #f87171 ${100 - scrollY / 20}%)`;
        });
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  });

  onDestroy(unsubscribe);

  const features = [
    {
      title: "AI Health Insights",
      icon: "🤖",
      description: "Personalized recommendations powered by advanced machine learning algorithms.",
    },
    {
      title: "Secure Tracking",
      icon: "🔐",
      description: "Military-grade encryption ensures your health data remains private and secure.",
    },
    {
      title: "Cross-Device Sync",
      icon: "📱",
      description: "Access your health data seamlessly across all your devices in real-time.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Fitness Coach",
      text: "This platform transformed how I track my clients' progress. The analytics are incredible!",
      photo: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      name: "Michael Chen",
      role: "Tech Entrepreneur",
      text: "Finally a health app that actually understands user needs. The AI predictions are spot-on!",
      photo: "https://randomuser.me/api/portraits/men/32.jpg",
    },
  ];

  let stats = [
    { value: "98%", label: "User Satisfaction" },
    { value: "1M+", label: "Active Users" },
    { value: "24/7", label: "Support" },
  ];
</script>

<svelte:head>
  <title>HealthAI</title>
  <meta name="description" content="Revolutionize your wellness journey with AI-powered health insights and tracking." />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;600;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 font-inter text-gray-900 dark:text-gray-100 transition-colors duration-700" bind:this={mainContainer}>
  <!-- Hero Section -->
  <section class="relative pt-36 pb-28 px-6 overflow-hidden">
    <div class="absolute inset-0 opacity-20 parallax-bg">
      <div class="absolute w-[600px] h-[600px] bg-gradient-to-r from-blue-400 to-coral-500 dark:from-blue-700 dark:to-coral-600 rounded-full blur-3xl -top-64 -left-64 animate-pulse"></div>
      <div class="absolute w-[600px] h-[600px] bg-gradient-to-r from-teal-300 to-amber-500 dark:from-teal-600 dark:to-amber-600 rounded-full blur-3xl -bottom-64 -right-64 animate-pulse"></div>
    </div>
    <div class="max-w-7xl mx-auto text-center">
      <h1 class="hero-title text-5xl md:text-7xl font-poppins font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-coral-500 dark:from-blue-400 dark:to-coral-400 leading-tight" in:fly={{ y: 50, duration: 1200 }}>
        Smarter Health<br />
        <span class="text-3xl md:text-4xl">Powered by AI</span>
      </h1>
      <p class="hero-text text-lg md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto" in:fade={{ duration: 1000, delay: 300 }}>
        Transform your wellness journey with cutting-edge AI analytics and seamless tracking.
      </p>
      <div class="hero-button flex justify-center gap-6" in:fly={{ y: 30, duration: 1000, delay: 500 }}>
        <button
          on:click={loginWithGoogle}
          aria-label="Login with Google"
          class="relative bg-gradient-to-r from-blue-600 to-coral-500 text-white px-10 py-4 rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-[1.05] transition-all duration-500 flex items-center gap-3 dark:from-blue-500 dark:to-coral-400 group overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-coral-600 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
          <svg class="w-6 h-6 group-hover:scale-125 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
          </svg>
          <span class="relative z-10">Login with Google</span>
        </button>
        <button
          class="relative bg-transparent border-2 border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400 px-10 py-4 rounded-full font-semibold text-lg hover:bg-amber-500 hover:text-white dark:hover:bg-amber-400 dark:hover:text-white transition-all duration-500 group"
        >
          <span class="relative z-10">Learn More</span>
        </button>
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="py-24 px-6">
    <div class="max-w-7xl mx-auto">
      <h2 class="text-5xl font-poppins font-extrabold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-coral-500 dark:from-blue-400 dark:to-coral-400" in:fade={{ duration: 1000 }}>
        Why Choose HealthAI
      </h2>
      <div class="grid md:grid-cols-3 gap-10">
        {#each features as feature, i}
          <div
            class="feature-card relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100/30 dark:border-gray-700/30 hover:scale-[1.03] overflow-hidden"
            in:fly={{ y: 30, duration: 1000, delay: i * 200 }}
          >
            <div class="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-coral-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <div class="text-6xl mb-8 z-10 relative text-amber-500 dark:text-amber-400">{feature.icon}</div>
            <h3 class="text-2xl font-poppins font-bold mb-4 text-gray-800 dark:text-white z-10 relative">{feature.title}</h3>
            <p class="text-gray-600 dark:text-gray-300 z-10 relative">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section id="testimonials" class="py-24 bg-gradient-to-b from-white to-amber-50 dark:from-gray-900 dark:to-amber-900/20 px-6">
    <div class="max-w-7xl mx-auto">
      <h2 class="text-5xl font-poppins font-extrabold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-coral-500 dark:from-blue-400 dark:to-coral-400" in:fade={{ duration: 1000 }}>
        Loved by Professionals
      </h2>
      <div class="grid md:grid-cols-2 gap-10">
        {#each testimonials as test, i}
          <div
            class="testimonial-card relative p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
            in:slide={{ duration: 800, delay: i * 200 }}
          >
            <div class="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-coral-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
            <div class="flex items-center gap-4 mb-6 z-10 relative">
              <img src={test.photo} alt={test.name} class="w-16 h-16 rounded-full object-cover shadow-md border-2 border-amber-500 dark:border-amber-400" />
              <div>
                <h3 class="text-xl font-poppins font-bold text-gray-800 dark:text-white">{test.name}</h3>
                <p class="text-gray-600 dark:text-gray-300">{test.role}</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-300 italic z-10 relative">"{test.text}"</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section id="stats" class="py-24 bg-gradient-to-r from-blue-600 via-coral-500 to-amber-500 dark:from-blue-700 dark:via-coral-600 dark:to-amber-600 text-white">
    <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10 text-center">
      {#each stats as stat, i}
        <div class="stat-card p-8" in:fly={{ y: 30, duration: 1000, delay: i * 200 }}>
          <div class="text-6xl font-poppins font-extrabold mb-4 animate-pulse">{stat.value}</div>
          <div class="text-xl text-gray-100">{stat.label}</div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-16 bg-gray-900 text-gray-300">
    <div class="max-w-7xl mx-auto px-6 text-center">
      <p class="mb-6 text-lg">© 2025 HealthAI. All rights reserved.</p>
      <div class="flex justify-center gap-8">
        <a href="/privacy" class="hover:text-coral-400 transition-colors duration-300">Privacy Policy</a>
        <a href="/terms" class="hover:text-coral-400 transition-colors duration-300">Terms of Service</a>
        <a href="/contact" class="hover:text-coral-400 transition-colors duration-300">Contact Us</a>
      </div>
    </div>
  </footer>

  <style global>
    @import 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap';

    :root {
      --card-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
      --card-hover-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
      --gradient-blue: #2563eb;
      --gradient-purple: #7c3aed;
      --gradient-teal: #2dd4bf;
      --gradient-coral: #f87171;
      --gradient-amber: #f59e0b;
    }

    .font-inter {
      font-family: 'Inter', sans-serif;
    }

    .font-poppins {
      font-family: 'Poppins', sans-serif;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    .feature-card, .testimonial-card {
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .feature-card:hover, .testimonial-card:hover {
      transform: translateY(-10px);
      box-shadow: var(--card-hover-shadow);
    }

    button:hover svg {
      transform: scale(1.3);
    }

    /* Smooth scroll behavior */
    html {
      scroll-behavior: smooth;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--gradient-coral);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--gradient-amber);
    }
  </style>
</div>