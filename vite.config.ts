import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit'

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit(),
        SvelteKitPWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
            manifest: {
                name: 'WtManagement',
                short_name: 'WtMgmt',
                description: 'Your weight management app',
                theme_color: '#18181b',
                background_color: '#18181b',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: 'img72.png',
                        sizes: '72x72',
                        type: 'image/png'
                    },
                    {
                        src: 'img96.png',
                        sizes: '96x96',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    ssr: {
        noExternal: ['gsap']
    },
    optimizeDeps: {
        include: ['gsap', 'gsap/ScrollTrigger']
    }
});
