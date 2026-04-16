#!/usr/bin/env bun

import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { buildAppBundle } from "./bundle";
import { loadConfig, type LoadedSolidBuildConfig } from "./config";

export interface BuildStaticAppResult {
  bundle: Bun.BuildOutput;
  entryFile: string;
}

export const buildStaticApp = async ({
  config,
  configDependencyPaths,
  configPath,
  cwd,
}: LoadedSolidBuildConfig): Promise<BuildStaticAppResult> => {
  const outdir = config.outDirPath;

  rmSync(outdir, { force: true, recursive: true });

  const built = await buildAppBundle(
    { config, configDependencyPaths, configPath, cwd },
    { development: false, minify: true, sourcemap: "none" },
  );

  for (const output of built.assets) {
    const { artifact, path } = output;
    await Bun.write(resolve(outdir, path), artifact);
  }

  for (const assetsDir of config.assetsDirs) {
    cpSync(assetsDir.inputPath, resolve(outdir, assetsDir.outputDirName), { force: true, recursive: true });
  }

  await Bun.write(resolve(outdir, "./index.html"), built.html);

  return { bundle: built.bundle, entryFile: built.entryFile };
};

const main = async (): Promise<void> => {
  const loadedConfig = await loadConfig(process.cwd());
  const result = await buildStaticApp(loadedConfig);

  if (!result.bundle.success) {
    throw new Error("solid-build failed");
  }

  console.log(`Built ${loadedConfig.cwd}/${loadedConfig.config.outDir}`);
  console.log(`Entry ${result.entryFile}`);
};

if (import.meta.main) {
  await main();
}
