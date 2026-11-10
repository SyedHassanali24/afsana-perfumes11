import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    // Run the Cloudflare Worker locally using npm run api.
    proxy: {
      "/api": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
});
