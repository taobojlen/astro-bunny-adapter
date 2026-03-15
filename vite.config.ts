import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        "entrypoints/server": resolve(
          import.meta.dirname,
          "src/entrypoints/server.ts",
        ),
      },
      formats: ["es"],
    },
    outDir: "dist",
    rollupOptions: {
      external: [
        "astro",
        "astro/app",
        /^node:/,
        "esbuild",
        "esbuild-plugin-node-protocol-imports",
        /@bunny\.net\//,
      ],
    },
    sourcemap: true,
    minify: false,
  },
});
