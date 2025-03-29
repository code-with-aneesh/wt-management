<script lang="ts">
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { user } from "$lib/stores/authStore";
    import { loginWithGoogle } from "$lib/firebase";
    import { onDestroy } from "svelte";
    import { goto } from "$app/navigation";

    let currentUser: any;
    const unsubscribe = user.subscribe((u) => {
        currentUser = u;
        if (currentUser) goto("/dashboard");
    });

    onDestroy(unsubscribe);

    const features = [
        {
            title: "AI Health Insights",
            icon: "🤖",
            description: "Get personalized recommendations powered by machine learning"
        },
        {
            title: "Secure Tracking",
            icon: "🔐",
            description: "Military-grade encryption for your health data"
        },
        {
            title: "Cross-Device Sync",
            icon: "📱",
            description: "Seamless access across all your devices"
        }
    ];

    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Fitness Coach",
            text: "This platform transformed how I track my clients' progress. The analytics are incredible!",
            photo: "https://randomuser.me/api/portraits/women/44.jpg"
        },
        {
            name: "Michael Chen",
            role: "Tech Entrepreneur",
            text: "Finally a health app that actually understands user needs. The AI predictions are spot-on!",
            photo: "https://randomuser.me/api/portraits/men/32.jpg"
        }
    ];

    let stats = [
        { value: "98%", label: "User Satisfaction" },
        { value: "1M+", label: "Active Users" },
        { value: "24/7", label: "Support" }
    ];
</script>

<svelte:head>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 font-inter transition-colors duration-300">
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20 dark:opacity-10">
        <div class="absolute w-96 h-96 bg-purple-200 dark:bg-purple-900 rounded-full blur-3xl opacity-40 -top-48 -left-48 animate-pulse"></div>
        <div class="absolute w-96 h-96 bg-blue-200 dark:bg-blue-900 rounded-full blur-3xl opacity-40 -bottom-48 -right-48 animate-pulse"></div>
    </div>

    <!-- Hero Section -->
    <section class="relative pt-32 pb-24 px-6">
        <div class="max-w-7xl mx-auto text-center">
            <h1 
                transition:fade={{ delay: 100 }}
                class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-300 leading-tight"
            >
                Smarter Health<br>
                <span class="text-3xl md:text-4xl text-gray-600 dark:text-gray-300">Powered by AI</span>
            </h1>

            <p 
                transition:fade={{ delay: 300 }}
                class="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
            >
                Revolutionize your wellness journey with predictive analytics and intelligent tracking
            </p>

            <div 
                transition:fly={{ y: 20, duration: 500 }}
                class="flex justify-center gap-4"
            >
                <button
                    on:click={loginWithGoogle}
                    class="bg-gradient-to-r from-blue-600 to-purple-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center gap-2 dark:from-blue-500 dark:to-purple-400"
                >
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/>
                    </svg>
                    Login with Google
                </button>
            </div>
        </div>
    </section>

    <!-- Features Grid -->
    <section class="py-20 px-6">
        <div class="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            {#each features as feature, i}
                <div 
                    transition:fly={{ y: 20, delay: i * 100 }}
                    class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
                >
                    <div class="text-4xl mb-6">{feature.icon}</div>
                    <h3 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">{feature.title}</h3>
                    <p class="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
            {/each}
        </div>
    </section>

    <!-- Testimonials -->
    <section class="py-20 bg-white dark:bg-gray-900 px-6">
        <div class="max-w-7xl mx-auto">
            <h2 class="text-3xl font-bold text-center mb-16 text-gray-800 dark:text-white">Trusted by Professionals</h2>
            <div class="grid md:grid-cols-2 gap-8">
                {#each testimonials as test, i}
                    <div 
                        transition:fly={{ x: i % 2 ? 50 : -50, duration: 500 }}
                        class="p-8 bg-gray-50 dark:bg-gray-800 rounded-2xl"
                    >
                        <div class="flex items-center gap-4 mb-6">
                            <img 
                                src={test.photo} 
                                alt={test.name}
                                class="w-16 h-16 rounded-full object-cover"
                            />
                            <div>
                                <h3 class="text-xl font-semibold text-gray-800 dark:text-white">{test.name}</h3>
                                <p class="text-gray-600 dark:text-gray-300">{test.role}</p>
                            </div>
                        </div>
                        <p class="text-gray-600 dark:text-gray-300 italic">"{test.text}"</p>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Stats -->
    <section class="py-20 bg-gradient-to-r from-blue-600 to-purple-500 dark:from-blue-700 dark:to-purple-600 text-white">
        <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
            {#each stats as stat, i}
                <div 
                    transition:fly={{ y: 20, delay: i * 100 }}
                    class="p-6"
                >
                    <div class="text-5xl font-bold mb-2 animate-float">{stat.value}</div>
                    <div class="text-gray-200 dark:text-gray-300">{stat.label}</div>
                </div>
            {/each}
        </div>
    </section>

    <style global>
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        .animate-float {
            animation: float 6s ease-in-out infinite;
        }
    </style>
</div>