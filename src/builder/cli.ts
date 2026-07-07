#!/usr/bin/env bun

import { runBuildCommand } from "./build";
import { runDevCommand } from "./dev";

const printUsage = () => {
    console.error("Usage: solid-lib <build|dev>");
};

const main = async (): Promise<void> => {
    const [command, ...restArgs] = Bun.argv.slice(2);

    if (restArgs.length > 0 || (command !== "build" && command !== "dev")) {
        printUsage();
        process.exit(1);
    }

    if (command === "build") {
        await runBuildCommand();
        return;
    }

    await runDevCommand();
};

if (import.meta.main) {
    await main();
}
