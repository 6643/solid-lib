import { existsSync, lstatSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import * as ts from "typescript";

import {
    findNearestExistingPath,
    getProjectRelativeSegments,
    isSameOrSubpath,
    resolveExistingRealPath,
    validateExistingPathTarget,
    validateProjectRootPath,
} from "./path";
import { loadUserConfig } from "./config-file";

export interface SolidBuildConfig {
    appComponent?: string;
    mountId?: string;
    appTitle?: string;
    assetsDirs?: string[];
    devPort?: number;
    outDir?: string;
    watchDirs?: string[];
}

export interface LoadedAssetDir {
    inputPath: string;
    outputDirName: string;
}

export interface LoadedSolidBuildConfig {
    config: {
        appComponent: string;
        appComponentPath: string;
        appTitle: string;
        assetsDirs: LoadedAssetDir[];
        appSourceRootPath: string;
        devPort: number;
        mountId: string;
        outDir: string;
        outDirPath: string;
    };
    configDependencyPaths: string[];
    configPath?: string;
    cwd: string;
    watchDirs: string[];
}

const DEFAULT_CONFIG: Required<Omit<SolidBuildConfig, "watchDirs">> & { watchDirs?: string[] } = {
    appComponent: "src/_.tsx",
    appTitle: "Solid App",
    assetsDirs: ["assets"],
    devPort: 3000,
    mountId: "app",
    outDir: "dist",
};

const ALLOWED_CONFIG_KEYS = new Set(["appComponent", "appTitle", "assetsDirs", "devPort", "mountId", "outDir", "watchDirs"]);
const LEGACY_CONFIG_KEYS = new Set(["entry", "html", "naming", "solid", "splitting", "tsconfig"]);
const DEFAULT_ASSET_DIR = "assets";
const RESERVED_PROJECT_DIR_NAMES = new Set([".git", "node_modules"]);
const DOM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9\-_.:]*$/;

const hasDefaultExport = (sourceFile: ts.SourceFile): boolean => {
    for (const statement of sourceFile.statements) {
        if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
            return true;
        }

        if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
            if (statement.exportClause.elements.some((element) => element.name.text === "default")) {
                return true;
            }
        }

        if (!ts.canHaveModifiers(statement)) {
            continue;
        }

        const modifiers = ts.getModifiers(statement) ?? [];
        const hasExportModifier = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
        const hasDefaultModifier = modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);

        if (hasExportModifier && hasDefaultModifier) {
            return true;
        }
    }

    return false;
};

const validateConfigKeys = (config: SolidBuildConfig): void => {
    for (const key of Object.keys(config)) {
        if (LEGACY_CONFIG_KEYS.has(key)) {
            throw new Error(`solid-lib config field "${key}" is no longer supported`);
        }

        if (!ALLOWED_CONFIG_KEYS.has(key)) {
            throw new Error(`solid-lib config field "${key}" is not supported`);
        }
    }

    if (config.assetsDirs !== undefined && !Array.isArray(config.assetsDirs)) {
        throw new Error('solid-lib config field "assetsDirs" must be an array of directory paths');
    }

    if (config.devPort !== undefined && (!Number.isInteger(config.devPort) || config.devPort <= 0 || config.devPort > 65535)) {
        throw new Error('solid-lib config field "devPort" must be an integer between 1 and 65535');
    }

    for (const assetDir of config.assetsDirs ?? []) {
        if (typeof assetDir !== "string" || assetDir.length === 0) {
            throw new Error('solid-lib config field "assetsDirs" must contain non-empty strings');
        }
    }

    for (const field of ["appComponent", "appTitle", "mountId", "outDir"] as const) {
        const value = config[field];
        if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
            throw new Error(`solid-lib config field "${field}" must be a non-empty string`);
        }
    }
};

const validateMountId = (mountId: string): void => {
    if (!DOM_ID_PATTERN.test(mountId)) {
        throw new Error(`solid-lib mountId must be a valid DOM id: ${mountId}`);
    }
};

const validateDefaultExport = async (appComponentPath: string): Promise<void> => {
    const source = await Bun.file(appComponentPath).text();
    const sourceFile = ts.createSourceFile(appComponentPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    if (!hasDefaultExport(sourceFile)) {
        throw new Error(`solid-lib app component must default export a component: ${appComponentPath}`);
    }
};

const getSourceTreePath = (cwd: string, appComponent: string): string | undefined => {
    const appComponentPath = resolve(cwd, appComponent);
    const relativeAppComponentPath = relative(cwd, appComponentPath);

    if (
        relativeAppComponentPath === "" ||
        relativeAppComponentPath.startsWith(`..${sep}`) ||
        relativeAppComponentPath === ".." ||
        isAbsolute(relativeAppComponentPath)
    ) {
        return undefined;
    }

    const normalizedRelativePath = relativeAppComponentPath.replace(/\\/g, "/");
    const segments = normalizedRelativePath.split("/").filter(Boolean);

    if (segments.length < 2) {
        return undefined;
    }

    const sourceRootIndex = segments.lastIndexOf("src");

    if (sourceRootIndex >= 0) {
        return resolve(cwd, ...segments.slice(0, sourceRootIndex + 1));
    }

    return resolve(cwd, ...segments.slice(0, -1));
};

const validateOutDirExistingAncestor = (cwd: string, outDirPath: string): void => {
    const existingAncestorPath = findNearestExistingPath(outDirPath);
    if (!existingAncestorPath) {
        return;
    }

    const realAncestorPath = resolveExistingRealPath(existingAncestorPath);
    if (!isSameOrSubpath(realAncestorPath, cwd)) {
        throw new Error("solid-lib outDir must not escape the project root through a symbolic link");
    }
};

const validateOutDir = (cwd: string, outDir: string, appComponent: string): string => {
    const outDirPath = resolve(cwd, outDir);
    const relativeOutDir = relative(cwd, outDirPath);

    if (relativeOutDir === "") {
        throw new Error("solid-lib outDir must not point at the project root");
    }
    if (relativeOutDir.startsWith(`..${sep}`) || relativeOutDir === ".." || isAbsolute(relativeOutDir)) {
        throw new Error(`solid-lib outDir must stay inside the project root: ${outDir}`);
    }
    if (getProjectRelativeSegments(cwd, outDirPath).some((segment) => RESERVED_PROJECT_DIR_NAMES.has(segment))) {
        throw new Error(`solid-lib outDir must not target a reserved project directory: ${outDir}`);
    }
    if (existsSync(outDirPath) && lstatSync(outDirPath).isSymbolicLink()) {
        throw new Error(`solid-lib outDir must not be a symbolic link: ${outDir}`);
    }
    validateOutDirExistingAncestor(cwd, outDirPath);

    const sourceTreePath = getSourceTreePath(cwd, appComponent);
    if (sourceTreePath && isSameOrSubpath(outDirPath, sourceTreePath)) {
        throw new Error(`solid-lib outDir must not be inside the app source tree: ${outDir}`);
    }

    return outDirPath;
};

const validateAssetSymlink = (assetRootRealPath: string, entryPath: string, originalPath: string): void => {
    const realEntryPath = resolveExistingRealPath(entryPath);
    if (!isSameOrSubpath(realEntryPath, assetRootRealPath)) {
        throw new Error(
            `solid-lib assetsDirs entries must not contain symlinks outside the assets directory: ${originalPath}`,
        );
    }
    if (statSync(realEntryPath).isDirectory()) {
        throw new Error(`solid-lib assetsDirs entries must not contain directory symlinks: ${originalPath}`);
    }
};

const validateAssetDirectory = (assetRootRealPath: string, entryPath: string, originalPath: string): void => {
    const realEntryPath = resolveExistingRealPath(entryPath);
    if (!isSameOrSubpath(realEntryPath, assetRootRealPath)) {
        throw new Error(`solid-lib assetsDirs entries must stay inside the assets directory: ${originalPath}`);
    }
};

const validateAssetTreeSymlinks = (assetRootPath: string, originalPath: string): void => {
    const assetRootRealPath = resolveExistingRealPath(assetRootPath);
    const pendingPaths = [assetRootPath];

    while (pendingPaths.length > 0) {
        const currentPath = pendingPaths.pop()!;
        validateAssetDirectory(assetRootRealPath, currentPath, originalPath);

        for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
            const entryPath = join(currentPath, entry.name);
            const stats = lstatSync(entryPath);

            if (stats.isSymbolicLink()) {
                validateAssetSymlink(assetRootRealPath, entryPath, originalPath);
                continue;
            }

            if (stats.isDirectory()) {
                pendingPaths.push(entryPath);
            }
        }
    }
};

const resolveAssetsDirs = (cwd: string, assetDirs: string[]): LoadedAssetDir[] => {
    const resolved: LoadedAssetDir[] = [];

    for (const assetDir of assetDirs) {
        const inputPath = resolve(cwd, assetDir);
        validateProjectRootPath(cwd, inputPath, "assetsDirs entries", assetDir);
        if (inputPath === cwd) {
            throw new Error(`solid-lib assetsDirs entries must not point at the project root: ${assetDir}`);
        }
        if (getProjectRelativeSegments(cwd, inputPath).some((segment) => RESERVED_PROJECT_DIR_NAMES.has(segment))) {
            throw new Error(`solid-lib assetsDirs entries must not target a reserved project directory: ${assetDir}`);
        }

        if (!existsSync(inputPath)) {
            if (assetDir === DEFAULT_ASSET_DIR) {
                continue;
            }
            throw new Error(`solid-lib assets directory was not found at ${inputPath}`);
        }
        validateExistingPathTarget(cwd, inputPath, "assetsDirs entries", assetDir);
        const realInputPath = resolveExistingRealPath(inputPath);

        if (realInputPath === cwd) {
            throw new Error(`solid-lib assetsDirs entries must not point at the project root: ${assetDir}`);
        }
        if (getProjectRelativeSegments(cwd, realInputPath).some((segment) => RESERVED_PROJECT_DIR_NAMES.has(segment))) {
            throw new Error(`solid-lib assetsDirs entries must not target a reserved project directory: ${assetDir}`);
        }

        if (!statSync(inputPath).isDirectory()) {
            throw new Error(`solid-lib assets path must be a directory: ${inputPath}`);
        }
        validateAssetTreeSymlinks(inputPath, assetDir);

        const outputDirName = assetDir.replace(/\\/g, "/").split("/").filter(Boolean).at(-1);
        if (!outputDirName) {
            throw new Error(`solid-lib assets directory must resolve to a directory name: ${assetDir}`);
        }

        if (resolved.some((dir) => dir.outputDirName === outputDirName)) {
            throw new Error(`solid-lib assets directory name is duplicated: ${outputDirName}`);
        }

        resolved.push({ inputPath, outputDirName });
    }

    return resolved;
};

const validateOutDirAssetOverlap = (outDirPath: string, assetsDirs: LoadedAssetDir[], outDir: string): void => {
    for (const assetsDir of assetsDirs) {
        if (isSameOrSubpath(outDirPath, assetsDir.inputPath) || isSameOrSubpath(assetsDir.inputPath, outDirPath)) {
            throw new Error(`solid-lib outDir must not overlap assetsDirs entries: ${outDir}`);
        }
    }
};

export const defineConfig = (config: SolidBuildConfig): SolidBuildConfig => config;

export const loadConfig = async (cwd: string = process.cwd()): Promise<LoadedSolidBuildConfig> => {
    const configPath = resolve(cwd, "./config.ts");
    const hasConfigFile = existsSync(configPath);
    const loadedUserConfig = hasConfigFile ? await loadUserConfig(configPath, cwd) : { config: {}, dependencyPaths: [] };
    const userConfig = loadedUserConfig.config;
    validateConfigKeys(userConfig);

    const mergedConfig = {
        ...DEFAULT_CONFIG,
        ...userConfig,
    };

    validateMountId(mergedConfig.mountId);

    const appComponentPath = resolve(cwd, mergedConfig.appComponent);
    validateProjectRootPath(cwd, appComponentPath, "app component", mergedConfig.appComponent);

    if (!existsSync(appComponentPath)) {
        throw new Error(`solid-lib app component was not found at ${appComponentPath}`);
    }
    validateExistingPathTarget(cwd, appComponentPath, "app component", mergedConfig.appComponent);
    if (!statSync(appComponentPath).isFile()) {
        throw new Error(`solid-lib app component must be a file: ${appComponentPath}`);
    }

    await validateDefaultExport(appComponentPath);

    const outDirPath = validateOutDir(cwd, mergedConfig.outDir, mergedConfig.appComponent);
    const assetsDirs = resolveAssetsDirs(cwd, mergedConfig.assetsDirs);
    validateOutDirAssetOverlap(outDirPath, assetsDirs, mergedConfig.outDir);

    return {
        config: {
            appComponent: mergedConfig.appComponent,
            appComponentPath,
            appTitle: mergedConfig.appTitle,
            assetsDirs,
            appSourceRootPath: getSourceTreePath(cwd, mergedConfig.appComponent) ?? resolve(appComponentPath, ".."),
            devPort: mergedConfig.devPort,
            mountId: mergedConfig.mountId,
            outDir: mergedConfig.outDir,
            outDirPath,
        },
        configDependencyPaths: loadedUserConfig.dependencyPaths,
        configPath: hasConfigFile ? configPath : undefined,
        cwd,
        watchDirs: mergedConfig.watchDirs ?? [],
    };
};
