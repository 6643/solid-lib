#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { buildAppBundle } from "./bundle";
import { loadConfig, type LoadedSolidBuildConfig } from "./config";
import { findWritableAncestorPath } from "./path";

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
        await Bun.write(resolve(targetDir, path), artifact);
    }

    for (const assetsDir of config.assetsDirs) {
        cpSync(assetsDir.inputPath, resolve(targetDir, assetsDir.outputDirName), {
            dereference: true,
            force: true,
            recursive: true,
        });
    }

    await Bun.write(resolve(targetDir, "./index.html"), built.html);

    return { bundle: built.bundle, entryFile: built.entryFile };
};

const replaceDirectory = (sourceDir: string, targetDir: string): void => {
    const parentDir = dirname(targetDir);
    mkdirSync(parentDir, { recursive: true });

    const backupDir = existsSync(targetDir) ? join(parentDir, `.solid-lib-prev-${process.hrtime.bigint()}`) : undefined;

    if (backupDir) {
        renameSync(targetDir, backupDir);
    }

    try {
        renameSync(sourceDir, targetDir);
    } catch (error) {
        if (backupDir && existsSync(backupDir)) {
            renameSync(backupDir, targetDir);
        }
        throw error;
    }

    if (backupDir) {
        rmSync(backupDir, { force: true, recursive: true });
    }
};

export const buildStaticApp = async (loadedConfig: LoadedSolidBuildConfig): Promise<BuildStaticAppResult> => {
    const { config, cwd } = loadedConfig;
    const outdir = config.outDirPath;
    const stagingBasePath = findWritableAncestorPath(dirname(outdir)) ?? findWritableAncestorPath(cwd) ?? tmpdir();
    const tempOutDir = mkdtempSync(join(stagingBasePath, ".solid-dist-"));

    try {
        const result = await writeBuildOutputs(loadedConfig, tempOutDir);
        replaceDirectory(tempOutDir, outdir);
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
