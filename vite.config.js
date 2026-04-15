import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	base: '/',

	build: {
		target: 'esnext', // Compiles to modern JS for better performance
		sourcemap: false, // Set to false in production to keep bundle size small
	},
	esbuild: {
		// Automatically drop all console.logs in the production build
		drop: ['console', 'debugger'],
	},

	plugins: [
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.ico'],
			workbox: {
				cleanupOutdatedCaches: true, // Automatically delete old version caches
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] // Cache all standard asset types
			},
			devOptions: { enabled: true }, // Allows testing PWA in dev mode
			manifest: {
				name: 'Notepad',
				short_name: 'Notepad',
				description: 'Simple offline notepad PWA',
				display: 'standalone',
				theme_color: '#000000',
				background_color: '#000000',
				icons: [
					{
						src: '/icon-192-192.png', // You will need to add these dummy icons to your /public folder later
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	]
});