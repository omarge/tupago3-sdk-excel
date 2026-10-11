import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Office Add-ins must allow the host (Excel) to load the bundle. We keep the
// bundle as a classic script (no ESM module preload) so it works behind the
// Office host webview. React is bundled.
export default defineConfig({
  root: ".",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input: {
        taskpane: "taskpane.html",
        functions: "functions.html",
        help: "help.html",
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  server: {
    port: 3000,
    host: "localhost",
  },
  preview: {
    port: 3000,
    host: "localhost",
  },
});
