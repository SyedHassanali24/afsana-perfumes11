import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In local dev, run `netlify dev` (Netlify CLI) alongside `npm run dev`,
    // or point this at wherever your functions are served, so calls to
    // /api/* reach netlify/functions/* instead of 404ing.
    proxy: {
      "/api": {
        target: "http://localhost:8888/.netlify/functions",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
