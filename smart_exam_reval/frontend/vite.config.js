import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: "ReValuate - AI Exam Revaluation",
        short_name: "ReValuate",
        description: "AI-powered exam revaluation system ensuring fair and transparent grading with Gemini Vision.",
        theme_color: "#7c3aed",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ],
        screenshots: [
          {
            "src": "/screenshots/screenshot_home_desktop.png",
            "sizes": "1280x720",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Home Page"
          },
          {
            "src": "/screenshots/screenshot_student_dashboard.png",
            "sizes": "1280x720",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Student Dashboard"
          },
          {
            "src": "/screenshots/screenshot_teacher_dashboard.png",
            "sizes": "1280x720",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Teacher Dashboard"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
  build: {
    sourcemap: false, // Prevents code theft/inspection
  }
})