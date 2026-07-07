import { defineConfig } from "solid-lib/builder";

export default defineConfig({
    rootComponentFile: "src/_.tsx",
    appTitle: "solid-lib demo",
    assetsDirs: ["assets"],
    outDir: "dist",
    watchDirs: ["../src"],
});
