import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
    plugins: [solid({ start: true, compiler: "native", ssr: false })],
    resolve: {
        alias: {
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
