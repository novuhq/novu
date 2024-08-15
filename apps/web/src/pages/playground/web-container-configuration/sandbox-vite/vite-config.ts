export const VITE_CONFIG = `import { defineConfig } from "vite";
export default defineConfig({
  server: {
    watch: {
      ignored: ["**/tsconfig.json"],
    },
  },
  optimizeDeps: {
    entries: [],
  },
});
`;
