import { existsSync, lstatSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

import { findWritableAncestorPath } from "./path";

import { transformAsync } from "@babel/core";
import * as ts from "typescript";

const BUN_COMMAND = Bun.which("bun") ?? "bun";
const SOLID_SOURCE_FILTER = /\.[cm]?[jt]sx?$/;
const JSX_SOURCE_FILTER = /\.[cm]?[jt]sx$/;
const TYPESCRIPT_SOURCE_FILTER = /\.[cm]?tsx?$/;
const SOLID_PRESET = "babel-preset-solid";

const stripTypeScript = (source: string, fileName: string): string =>
    ts.transpileModule(source, {
        compilerOptions: {
            jsx: ts.JsxEmit.Preserve,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ESNext,
        },
        fileName,
    }).outputText;

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
        BUN_COMMAND,
        "x",
        "tsc",
        "--project",
        tsconfigPath,
        "--declaration",
        "--emitDeclarationOnly",
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
        builder.onLoad({ filter: SOLID_SOURCE_FILTER }, async ({ path }) => {
            const source = await Bun.file(path).text();
            const usesJsx = JSX_SOURCE_FILTER.test(path);
            const typedSource = TYPESCRIPT_SOURCE_FILTER.test(path) ? stripTypeScript(source, path) : source;
            const transformed = usesJsx
                ? await transformAsync(typedSource, {
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
                      ],
                      sourceMaps: false,
                  })
                : { code: typedSource };

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

const validateLibraryOutdir = (outdir: string): string => {
    const resolvedOutdir = resolve(outdir);

    if (resolvedOutdir === resolve(sep) || resolvedOutdir === dirname(resolvedOutdir)) {
        throw new Error("solid-lib library outdir must not point at a filesystem root");
    }

    if (existsSync(resolvedOutdir) && lstatSync(resolvedOutdir).isSymbolicLink()) {
        throw new Error(`solid-lib library outdir must not be a symbolic link: ${outdir}`);
    }

    return resolvedOutdir;
};

const replaceDirectory = (sourceDir: string, targetDir: string): void => {
    const parentDir = dirname(targetDir);
    mkdirSync(parentDir, { recursive: true });

    const backupDir = existsSync(targetDir) ? join(parentDir, `.solid-lib-lib-prev-${process.hrtime.bigint()}`) : undefined;

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

export const buildLibrary = async (options: BuildLibraryOptions): Promise<BuildLibraryResult> => {
    const outdir = validateLibraryOutdir(options.outdir);
    const entrypoints = options.entrypoints.map((entrypoint) => resolve(entrypoint));
    const external = Array.from(new Set(["solid-js", "solid-js/web", ...(options.external ?? [])]));
    const stagingBasePath = findWritableAncestorPath(dirname(outdir)) ?? tmpdir();
    const tempOutDir = mkdtempSync(join(stagingBasePath, ".solid-lib-build-"));

    try {
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
            outdir: tempOutDir,
            packages: options.packages ?? "external",
            plugins: [createSolidPlugin(options.solid)],
            sourcemap: options.sourcemap ?? "none",
            target: options.target ?? "browser",
            throw: true,
            tsconfig: options.tsconfig ? resolve(options.tsconfig) : undefined,
        });

        const declarations = await maybeBuildDeclarations(options, entrypoints, tempOutDir);
        replaceDirectory(tempOutDir, outdir);

        return { bundle, declarations };
    } catch (error) {
        rmSync(tempOutDir, { force: true, recursive: true });
        throw error;
    }
};
