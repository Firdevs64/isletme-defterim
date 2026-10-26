import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "İşletme Defterim",
        short_name: "Defterim",

        description:
          "Müşteri, iş, tahsilat ve gider takibi için işletme defteri.",

        theme_color: "#007384",
        background_color: "#f4f6f8",
        categories: ["business", "finance"],

        display: "standalone",
        start_url: "/",
        scope: "/",

        orientation: "portrait",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg}",
        ],
      },

      /*
       * Geliştirme sırasında Service Worker'ı kapatıyoruz.
       * Production build'de PWA yine oluşturulacak.
       */
      devOptions: {
        enabled: false,
      },
    }),
  ],
});