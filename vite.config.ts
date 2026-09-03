import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    // Remove crossorigin attribute from asset tags to avoid CORS issues on same-origin deployments
    modulePreload: { polyfill: false },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api/graphql": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api": "http://localhost:3001",
    },
  },
});
