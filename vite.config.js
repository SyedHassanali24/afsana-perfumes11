import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev: run `npm run api` (Netlify CLI, port 8888) so /api/* reaches netlify/functions/*.
    // Vite crashed with EBUSY while watching the bundled functions, so .netlify is ignored.
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
