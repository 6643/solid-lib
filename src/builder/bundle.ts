import { accessSync, constants, existsSync, mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { dirname } from "node:path";
import { tmpdir } from "node:os";

import type { BuildArtifact, BuildOutput } from "bun";

import type { LoadedSolidBuildConfig } from "./config";
import { createSolidPlugin } from "./lib";

export const APP_RUNTIME_MODULE = "dom-expressions/src/client";
export const DEFAULT_ENTRY_NAMING: Bun.BuildConfig["naming"] = {
  chunk: "[hash].js",
  entry: "[hash].js",
};

export const createBootstrapSource = ({
  appComponentImportPath,
  mountId,
}: {
  appComponentImportPath: string;
  mountId: string;
}): string => {
  return [
    `import { render } from "${APP_RUNTIME_MODULE}";`,
    `import App from "${appComponentImportPath}";`,
    "",
    `const root = document.getElementById(${JSON.stringify(mountId)});`,
    "",
    "if (!root) {",
    `  throw new Error(${JSON.stringify(`Demo root "#${mountId}" was not found.`)});`,
    "}",
    "",
    "render(() => <App />, root);",
  ].join("\n");
};

export const createHtmlShell = ({
  appTitle,
  cssFiles,
  entryFile,
  mountId,
}: {
  appTitle: string;
  cssFiles: string[];
  entryFile: string;
  mountId: string;
}): string => {
  const styles = cssFiles.map((file) => `  <link rel="stylesheet" href="./${file}">`).join("\n");

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(appTitle)}</title>`,
    ...(styles ? [styles] : []),
    "</head>",
    "<body>",
    `  <div id="${escapeHtml(mountId)}"></div>`,
    `  <script type="module" src="./${entryFile}"></script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
};

export const normalizeImportPath = (importPath: string): string =>
  importPath.startsWith(".") ? importPath.replace(/\\/g, "/") : `./${importPath.replace(/\\/g, "/")}`;

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export interface BuiltAppAsset {
  artifact: BuildArtifact;
  path: string;
}

export interface BuiltAppBundle {
  assets: BuiltAppAsset[];
  bundle: BuildOutput;
  cssFiles: string[];
  entryFile: string;
  html: string;
}

export interface BuildAppBundleOptions {
  development?: boolean;
  minify?: boolean;
  sourcemap?: Bun.BuildConfig["sourcemap"];
}

const findNearestNodeModulesPath = (startPath: string): string | undefined => {
  let currentPath = resolve(startPath);

  while (true) {
    const nodeModulesPath = join(currentPath, "node_modules");
    if (existsSync(nodeModulesPath) && statSync(nodeModulesPath).isDirectory()) {
      return nodeModulesPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return undefined;
    }
    currentPath = parentPath;
  }
};

const findWritableAncestorPath = (startPath: string): string | undefined => {
  let currentPath = resolve(startPath);

  while (true) {
    try {
      accessSync(currentPath, constants.W_OK);
      return currentPath;
    } catch {}

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return undefined;
    }
    currentPath = parentPath;
  }
};

export const buildAppBundle = async (
  loadedConfig: LoadedSolidBuildConfig,
  options: BuildAppBundleOptions = {},
): Promise<BuiltAppBundle> => {
  const { config, cwd } = loadedConfig;
  const stagingBasePath = findWritableAncestorPath(cwd) ?? tmpdir();
  const tempDir = mkdtempSync(join(stagingBasePath, ".solid-app-"));
  const bootstrapPath = join(tempDir, "bootstrap.tsx");

  try {
    const nodeModulesPath = findNearestNodeModulesPath(cwd);
    const resolvedAliases =
      nodeModulesPath
        ? {
            ...resolveIfExists("solid-js", resolve(nodeModulesPath, "solid-js", options.development ? "dist/dev.js" : "dist/solid.js")),
            ...resolveIfExists(
              "@solidjs/signals",
              resolve(nodeModulesPath, "@solidjs/signals", options.development ? "dist/dev.js" : "dist/prod.js"),
            ),
          }
        : undefined;

    if (nodeModulesPath) {
      symlinkSync(nodeModulesPath, join(tempDir, "node_modules"), "dir");
    }

    await Bun.write(
      bootstrapPath,
      createBootstrapSource({
        appComponentImportPath: normalizeImportPath(relative(tempDir, config.appComponentPath)),
        mountId: config.mountId,
      }),
    );

    const bundle = await Bun.build({
      entrypoints: [bootstrapPath],
      format: "esm",
      minify: options.minify ?? true,
      naming: DEFAULT_ENTRY_NAMING,
      packages: "bundle",
      plugins: [
        createSolidPlugin({
          development: options.development ?? false,
          moduleName: APP_RUNTIME_MODULE,
          resolve: resolvedAliases,
        }),
      ],
      splitting: true,
      sourcemap: options.sourcemap ?? "none",
      target: "browser",
      throw: true,
      tsconfig: resolve(cwd, "./tsconfig.json"),
    });

    const normalizedAssets = bundle.outputs.map((artifact) => ({
      artifact,
      path: normalizeArtifactPath(artifact),
    }));

    const entryAsset = normalizedAssets.find((output) => output.artifact.kind === "entry-point") ?? normalizedAssets[0];
    if (!entryAsset) {
      throw new Error("solid-build did not emit an entry bundle");
    }

    const cssFiles = normalizedAssets
      .filter((output) => output.artifact.kind === "asset" && output.path.endsWith(".css"))
      .map((output) => output.path);

    const html = createHtmlShell({
      appTitle: config.appTitle,
      cssFiles,
      entryFile: entryAsset.path,
      mountId: config.mountId,
    });

    return {
      assets: normalizedAssets,
      bundle,
      cssFiles,
      entryFile: entryAsset.path,
      html,
    };
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

const resolveIfExists = (specifier: string, targetPath: string): Record<string, string> =>
  existsSync(targetPath) ? { [specifier]: targetPath } : {};

export const normalizeArtifactPath = (artifact: BuildArtifact): string => {
  const relativePath = artifact.path.replace(/^\.\//, "");

  if (artifact.kind === "asset" && relativePath.endsWith(".js")) {
    return `${relativePath.slice(0, -3)}.css`;
  }

  return relativePath;
};

export const getAssetContentType = (assetPath: string, artifact: BuildArtifact): string => {
  if (assetPath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (assetPath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (artifact.loader === "json") {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
};
