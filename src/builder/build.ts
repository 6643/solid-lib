#!/usr/bin/env bun

import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { buildAppBundle } from "./bundle";
import { loadConfig, type LoadedSolidBuildConfig } from "./config";
import { findWritableAncestorPath, replaceDirectory, resolveContainedOutputPath } from "./path";

export interface BuildStaticAppResult {
    bundle: Bun.BuildOutput;
    entryFile: string;
}

const writeBuildOutputs = async (
    loadedConfig: LoadedSolidBuildConfig,
    targetDir: string,
): Promise<BuildStaticAppResult> => {
    const { config } = loadedConfig;
    const built = await buildAppBundle(loadedConfig, { development: false, minify: true, sourcemap: "none" });

    for (const output of built.assets) {
        const { artifact, path } = output;
        await Bun.write(resolveContainedOutputPath(targetDir, path), artifact);
    }

    for (const assetsDir of config.assetsDirs) {
        cpSync(assetsDir.inputPath, resolve(targetDir, assetsDir.outputDirName), {
            dereference: true,
            force: true,
            recursive: true,
        });
    }

    await Bun.write(resolveContainedOutputPath(targetDir, "index.html"), built.html);

    return { bundle: built.bundle, entryFile: built.entryFile };
};

export const buildStaticApp = async (loadedConfig: LoadedSolidBuildConfig): Promise<BuildStaticAppResult> => {
    const { config, cwd } = loadedConfig;
    const outdir = config.outDirPath;
    const stagingBasePath = findWritableAncestorPath(dirname(outdir)) ?? findWritableAncestorPath(cwd) ?? tmpdir();
    const tempOutDir = mkdtempSync(join(stagingBasePath, ".solid-dist-"));

    try {
        const result = await writeBuildOutputs(loadedConfig, tempOutDir);
        replaceDirectory(tempOutDir, outdir, ".solid-lib-prev-");
        return result;
    } catch (error) {
        rmSync(tempOutDir, { force: true, recursive: true });
        throw error;
    }
};

export const runBuildCommand = async (cwd: string = process.cwd()): Promise<void> => {
    const loadedConfig = await loadConfig(cwd);
    const result = await buildStaticApp(loadedConfig);

    if (!result.bundle.success) {
        throw new Error("solid-lib build failed");
    }

    console.log(`Built ${loadedConfig.cwd}/${loadedConfig.config.outDir}`);
    console.log(`Entry ${result.entryFile}`);
};

if (import.meta.main) {
    await runBuildCommand();
}
