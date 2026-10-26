import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isGitHubPages ? "/afsana-perfumes11/" : "/",
  plugins: [react()],
  server: {
    // Local dev: run `npm run api` so /api/* reaches Netlify Functions.
    watch: { ignored: [/\.netlify/] },
    proxy: {
      "/api": {
        target: "http://localhost:8888/.netlify/functions",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
