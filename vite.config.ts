import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps the build working on GitHub Pages from any repository path.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
