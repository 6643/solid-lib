import { fileURLToPath } from "node:url";
import { defineConfig, lazyPlugins } from "vite-plus";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [solid({ start: true, compiler: "native", ssr: false })]),
  resolve: {
    alias: {
      "solid-lib/route": fileURLToPath(new URL("../src/Route.ts", import.meta.url)),
      "solid-lib/ui.css": fileURLToPath(new URL("../src/_.css", import.meta.url)),
      "solid-lib": fileURLToPath(new URL("../src/_.ts", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    watch: { usePolling: true },
  },
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
});
