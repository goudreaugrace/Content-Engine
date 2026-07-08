import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Port: read from PORT env var when set (the harness assigns a free
    // port via .claude/launch.json autoPort and exposes it through PORT).
    // Falls back to Vite's default 5173 for direct `npm run dev` use.
    // Pinning a fixed port here previously caused launch failures when
    // 5173 was occupied by another local process. The API proxy is fine
    // either way — it targets the Express server on its dedicated 3001.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
