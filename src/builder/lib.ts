import { rmSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

import { transformAsync } from "@babel/core";

const SOLID_SOURCE_FILTER = /\.[cm]?[jt]sx$/;
const TYPESCRIPT_JSX_FILTER = /\.[cm]?tsx$/;
const SOLID_PRESET = "babel-preset-solid";
const TYPESCRIPT_PRESET = "@babel/preset-typescript";
const DOM_EXPRESSIONS_CLIENT_MODULE = "dom-expressions/src/client";
const SOLID_PLUGIN_RUNTIME_NAMESPACE = "solid-plugin-runtime";
const DOM_EXPRESSIONS_SOLID_CORE_MODULE = "solid-plugin:dom-expressions-solid-core";
const DOM_EXPRESSIONS_SOLID_CORE_SOURCE = [
    'import { createComponent, createMemo, createRenderEffect, createRoot, getOwner, sharedConfig, untrack } from "solid-js";',
    "",
    "export const root = createRoot;",
    "export { createComponent, getOwner, sharedConfig, untrack };",
    "",
    "export const effect = (compute, effectOrInitial, initialValue) => {",
    "  if (typeof effectOrInitial === \"function\") {",
    "    createRenderEffect(compute, effectOrInitial, initialValue);",
    "    return;",
    "  }",
    "",
    "  createRenderEffect(compute, () => {}, effectOrInitial);",
    "};",
    "",
    "export const memo = (compute, equal) => createMemo(compute, undefined, equal ? undefined : { equals: false });",
    "",
    "export const mergeProps = (...sources) => Object.assign({}, ...sources);",
].join("\n");

export interface SolidPluginOptions {
    development?: boolean;
    generate?: "dom" | "ssr" | "universal";
    hydratable?: boolean;
    moduleName?: string;
    resolve?: Record<string, string>;
}

export interface BuildLibraryOptions {
    declarations?: boolean | DeclarationBuildOptions;
    entrypoints: string[];
    external?: string[];
    format?: "esm" | "cjs" | "iife";
    minify?: Bun.BuildConfig["minify"];
    naming?: Bun.BuildConfig["naming"];
    outdir: string;
    packages?: "bundle" | "external";
    solid?: SolidPluginOptions;
    sourcemap?: Bun.BuildConfig["sourcemap"];
    target?: Bun.BuildConfig["target"];
    tsconfig?: string;
}

export interface BuildLibraryResult {
    bundle: Bun.BuildOutput;
    declarations?: DeclarationBuildResult;
}

export interface DeclarationBuildOptions {
    tsconfig?: string;
}

export interface DeclarationBuildResult {
    command: string[];
    stderr: string;
    stdout: string;
    success: boolean;
}

const getCommonSourceRoot = (entrypoints: string[]): string => {
    if (entrypoints.length === 0) {
        throw new Error("At least one entrypoint is required to build declarations.");
    }

    const directories = entrypoints.map((entrypoint) => dirname(entrypoint).split(sep));
    const [firstDirectory, ...remainingDirectories] = directories;

    if (!firstDirectory) {
        throw new Error("At least one entrypoint directory is required.");
    }

    const sharedSegments = firstDirectory.slice();

    for (const segments of remainingDirectories) {
        let index = 0;
        while (index < sharedSegments.length && index < segments.length && sharedSegments[index] === segments[index]) {
            index += 1;
        }
        sharedSegments.length = index;
    }

    if (sharedSegments.length === 0) {
        const [firstEntrypoint] = entrypoints;
        if (!firstEntrypoint) {
            throw new Error("At least one entrypoint is required to build declarations.");
        }
        return dirname(firstEntrypoint);
    }

    return sharedSegments.join(sep) || sep;
};

const maybeBuildDeclarations = async (
    options: BuildLibraryOptions,
    entrypoints: string[],
    outdir: string,
): Promise<DeclarationBuildResult | undefined> => {
    if (!options.declarations) {
        return undefined;
    }

    const declarationOptions = typeof options.declarations === "object" ? options.declarations : undefined;
    const configuredTsconfigPath = declarationOptions?.tsconfig ?? options.tsconfig;

    if (!configuredTsconfigPath) {
        throw new Error("Declaration builds require a tsconfig path.");
    }

    const tsconfigPath = resolve(configuredTsconfigPath);
    const rootDir = getCommonSourceRoot(entrypoints);

    const command = [
        process.execPath,
        resolve(import.meta.dir, "../../node_modules/typescript/bin/tsc"),
        "--project",
        tsconfigPath,
        "--declaration",
        "--emitDeclarationOnly",
        "--declarationMap",
        "false",
        "--noEmit",
        "false",
        "--outDir",
        outdir,
        "--rootDir",
        rootDir,
    ];

    const subprocess = Bun.spawn({
        cmd: command,
        cwd: dirname(tsconfigPath),
        stderr: "pipe",
        stdout: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(subprocess.stdout).text(),
        new Response(subprocess.stderr).text(),
        subprocess.exited,
    ]);

    if (exitCode !== 0) {
        throw new Error(
            [`Type declaration build failed with exit code ${exitCode}.`, stdout, stderr].filter(Boolean).join("\n"),
        );
    }

    return {
        command,
        stderr,
        stdout,
        success: true,
    };
};

export const createSolidPlugin = (options: SolidPluginOptions = {}): Bun.BunPlugin => ({
    name: "solid-plugin",
    target: "browser",
    setup: (builder) => {
        for (const [specifier, resolvedPath] of Object.entries(options.resolve ?? {})) {
            builder.onResolve({ filter: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }, () => ({
                path: resolvedPath,
            }));
        }

        if (options.moduleName === DOM_EXPRESSIONS_CLIENT_MODULE) {
            builder.onResolve({ filter: /^rxcore$/ }, () => ({
                namespace: SOLID_PLUGIN_RUNTIME_NAMESPACE,
                path: DOM_EXPRESSIONS_SOLID_CORE_MODULE,
            }));
            builder.onLoad(
                { filter: /^solid-plugin:dom-expressions-solid-core$/, namespace: SOLID_PLUGIN_RUNTIME_NAMESPACE },
                () => ({
                    contents: DOM_EXPRESSIONS_SOLID_CORE_SOURCE,
                    loader: "js",
                }),
            );
        }

        builder.onLoad({ filter: SOLID_SOURCE_FILTER }, async ({ path }) => {
            const source = await Bun.file(path).text();
            const transformed = await transformAsync(source, {
                babelrc: false,
                configFile: false,
                filename: path,
                presets: [
                    [
                        SOLID_PRESET,
                        {
                            dev: options.development ?? false,
                            generate: options.generate ?? "dom",
                            hydratable: options.hydratable ?? false,
                            moduleName: options.moduleName ?? "solid-js/web",
                        },
                    ],
                    ...(TYPESCRIPT_JSX_FILTER.test(path)
                        ? [[TYPESCRIPT_PRESET, { allExtensions: true, isTSX: true }]]
                        : []),
                ],
                sourceMaps: false,
            });

            if (!transformed?.code) {
                throw new Error(`Solid transform returned no output for ${path}`);
            }

            return {
                contents: transformed.code,
                loader: "js",
            };
        });
    },
});

export const buildLibrary = async (options: BuildLibraryOptions): Promise<BuildLibraryResult> => {
    const outdir = resolve(options.outdir);
    const entrypoints = options.entrypoints.map((entrypoint) => resolve(entrypoint));
    const external = Array.from(new Set(["solid-js", "solid-js/web", ...(options.external ?? [])]));

    rmSync(outdir, { force: true, recursive: true });

    const bundle = await Bun.build({
        entrypoints,
        external,
        format: options.format ?? "esm",
        minify: options.minify ?? false,
        naming: options.naming ?? {
            asset: "assets/[name]-[hash].[ext]",
            chunk: "chunks/[name]-[hash].js",
            entry: "[name].js",
        },
        outdir,
        packages: options.packages ?? "external",
        plugins: [createSolidPlugin(options.solid)],
        sourcemap: options.sourcemap ?? "none",
        target: options.target ?? "browser",
        throw: true,
        tsconfig: options.tsconfig ? resolve(options.tsconfig) : undefined,
    });

    const declarations = await maybeBuildDeclarations(options, entrypoints, outdir);

    return { bundle, declarations };
};
