import { accessSync, constants, existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, statSync, symlinkSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import * as ts from "typescript";

export interface SolidBuildConfig {
    appComponent?: string;
    mountId?: string;
    appTitle?: string;
    assetsDirs?: string[];
    devPort?: number;
    outDir?: string;
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
}

const DEFAULT_CONFIG: Required<SolidBuildConfig> = {
    appComponent: "src/_.tsx",
    appTitle: "Solid App",
    assetsDirs: ["assets"],
    devPort: 3000,
    mountId: "app",
    outDir: "dist",
};

const ALLOWED_CONFIG_KEYS = new Set(["appComponent", "appTitle", "assetsDirs", "devPort", "mountId", "outDir"]);
const LEGACY_CONFIG_KEYS = new Set(["entry", "html", "naming", "solid", "splitting", "tsconfig"]);
const DEFAULT_ASSET_DIR = "assets";
const DOM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9\-_.:]*$/;
const CONFIG_IMPORT_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

const createSourceCacheKey = (source: string): string => {
    let hash = 0;

    for (let index = 0; index < source.length; index += 1) {
        hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
    }

    return hash.toString(16);
};

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

const resolveExistingRealPath = (targetPath: string): string => {
    return realpathSync.native?.(targetPath) ?? realpathSync(targetPath);
};

const toFileUrlHref = (filePath: string): string => {
    const url = new URL("file:///");
    url.pathname = resolve(filePath).replace(/%/g, "%25").replace(/\\/g, "/");
    return url.href;
};

const getScriptKind = (filePath: string): ts.ScriptKind => {
    switch (extname(filePath)) {
        case ".tsx":
        case ".jsx":
            return ts.ScriptKind.TSX;
        case ".js":
        case ".mjs":
        case ".cjs":
            return ts.ScriptKind.JS;
        default:
            return ts.ScriptKind.TS;
    }
};

const getRelativeModuleSpecifiers = (sourceFile: ts.SourceFile): string[] => {
    const specifiers = new Set<string>();

    const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier;
            if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text.startsWith(".")) {
                specifiers.add(moduleSpecifier.text);
            }
        }

        if (
            ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword &&
            node.arguments.length > 0 &&
            (() => {
                const [firstArgument] = node.arguments;
                return !!firstArgument && ts.isStringLiteral(firstArgument) && firstArgument.text.startsWith(".");
            })()
        ) {
            const [firstArgument] = node.arguments;
            specifiers.add((firstArgument as ts.StringLiteral).text);
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return Array.from(specifiers);
};

const resolveRelativeImportPath = (fromPath: string, specifier: string): string => {
    const basePath = resolve(dirname(fromPath), specifier);
    const candidates = [
        basePath,
        ...CONFIG_IMPORT_EXTENSIONS.map((extension) => `${basePath}${extension}`),
        ...CONFIG_IMPORT_EXTENSIONS.map((extension) => resolve(basePath, `index${extension}`)),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
            return candidate;
        }
    }

    throw new Error(`solid-build config import was not found: ${specifier} from ${fromPath}`);
};

const collectConfigDependencyPaths = async (configPath: string, cwd: string): Promise<string[]> => {
    const visited = new Set<string>();
    const queue = [configPath];

    while (queue.length > 0) {
        const currentPath = queue.shift()!;
        if (visited.has(currentPath)) {
            continue;
        }

        visited.add(currentPath);

        const source = await Bun.file(currentPath).text();
        const sourceFile = ts.createSourceFile(currentPath, source, ts.ScriptTarget.Latest, true, getScriptKind(currentPath));

        for (const specifier of getRelativeModuleSpecifiers(sourceFile)) {
            const dependencyPath = resolveRelativeImportPath(currentPath, specifier);
            validateProjectRootPath(cwd, dependencyPath, "config imports", specifier);
            validateExistingPathTarget(cwd, dependencyPath, "config imports", specifier);
            if (!visited.has(dependencyPath)) {
                queue.push(dependencyPath);
            }
        }
    }

    return Array.from(visited).sort();
};

const loadUserConfig = async (
    configPath: string,
    cwd: string,
): Promise<{ config: SolidBuildConfig; dependencyPaths: string[] }> => {
    const dependencyPaths = await collectConfigDependencyPaths(configPath, cwd);
    const stagingBasePath = findWritableAncestorPath(cwd) ?? tmpdir();
    const tempRoot = mkdtempSync(join(stagingBasePath, ".solid-build-config-"));
    const tempConfigPath = join(tempRoot, relative(cwd, configPath));

    try {
        for (const dependencyPath of dependencyPaths) {
            const relativeDependencyPath = relative(cwd, dependencyPath);
            const stagedPath = join(tempRoot, relativeDependencyPath);
            mkdirSync(dirname(stagedPath), { recursive: true });
            await Bun.write(stagedPath, Bun.file(dependencyPath));
        }

        const nodeModulesPath = findNearestNodeModulesPath(cwd);
        if (nodeModulesPath) {
            symlinkSync(nodeModulesPath, join(tempRoot, "node_modules"), "dir");
        }

        const module = await import(toFileUrlHref(tempConfigPath));
        const userConfig = module.default as SolidBuildConfig | undefined;

        if (!userConfig) {
            throw new Error(`solid-build config at ${configPath} must export a default config object`);
        }

        if (typeof userConfig !== "object" || Array.isArray(userConfig)) {
            throw new Error(`solid-build config at ${configPath} must export an object`);
        }

        return { config: userConfig, dependencyPaths };
    } finally {
        rmSync(tempRoot, { force: true, recursive: true });
    }
};

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
            throw new Error(`solid-build config field "${key}" is no longer supported`);
        }

        if (!ALLOWED_CONFIG_KEYS.has(key)) {
            throw new Error(`solid-build config field "${key}" is not supported`);
        }
    }

    if (config.assetsDirs !== undefined && !Array.isArray(config.assetsDirs)) {
        throw new Error('solid-build config field "assetsDirs" must be an array of directory paths');
    }

    if (config.devPort !== undefined && (!Number.isInteger(config.devPort) || config.devPort <= 0 || config.devPort > 65535)) {
        throw new Error('solid-build config field "devPort" must be an integer between 1 and 65535');
    }

    for (const assetDir of config.assetsDirs ?? []) {
        if (typeof assetDir !== "string" || assetDir.length === 0) {
            throw new Error('solid-build config field "assetsDirs" must contain non-empty strings');
        }
    }

    for (const field of ["appComponent", "appTitle", "mountId", "outDir"] as const) {
        const value = config[field];
        if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
            throw new Error(`solid-build config field "${field}" must be a non-empty string`);
        }
    }
};

const validateMountId = (mountId: string): void => {
    if (!DOM_ID_PATTERN.test(mountId)) {
        throw new Error(`solid-build mountId must be a valid DOM id: ${mountId}`);
    }
};

const validateDefaultExport = async (appComponentPath: string): Promise<void> => {
    const source = await Bun.file(appComponentPath).text();
    const sourceFile = ts.createSourceFile(appComponentPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    if (!hasDefaultExport(sourceFile)) {
        throw new Error(`solid-build app component must default export a component: ${appComponentPath}`);
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

const isSameOrSubpath = (targetPath: string, basePath: string): boolean => {
    const relativePath = relative(basePath, targetPath);
    return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
};

const validateProjectRootPath = (cwd: string, targetPath: string, label: string, originalPath: string): void => {
    if (!isSameOrSubpath(targetPath, cwd)) {
        throw new Error(`solid-build ${label} must stay inside the project root: ${originalPath}`);
    }
};

const validateExistingPathTarget = (cwd: string, targetPath: string, label: string, originalPath: string): void => {
    const realTargetPath = resolveExistingRealPath(targetPath);
    if (!isSameOrSubpath(realTargetPath, cwd)) {
        throw new Error(`solid-build ${label} must stay inside the project root: ${originalPath}`);
    }
};

const validateOutDir = (cwd: string, outDir: string, appComponent: string): string => {
    const outDirPath = resolve(cwd, outDir);
    const relativeOutDir = relative(cwd, outDirPath);

    if (relativeOutDir === "") {
        throw new Error("solid-build outDir must not point at the project root");
    }
    if (relativeOutDir.startsWith(`..${sep}`) || relativeOutDir === ".." || isAbsolute(relativeOutDir)) {
        throw new Error(`solid-build outDir must stay inside the project root: ${outDir}`);
    }
    if (existsSync(outDirPath) && lstatSync(outDirPath).isSymbolicLink()) {
        throw new Error(`solid-build outDir must not be a symbolic link: ${outDir}`);
    }

    const sourceTreePath = getSourceTreePath(cwd, appComponent);
    if (sourceTreePath && isSameOrSubpath(outDirPath, sourceTreePath)) {
        throw new Error(`solid-build outDir must not be inside the app source tree: ${outDir}`);
    }

    return outDirPath;
};

const resolveAssetsDirs = (cwd: string, assetDirs: string[]): LoadedAssetDir[] => {
    const resolved: LoadedAssetDir[] = [];

    for (const assetDir of assetDirs) {
        const inputPath = resolve(cwd, assetDir);
        validateProjectRootPath(cwd, inputPath, "assetsDirs entries", assetDir);

        if (!existsSync(inputPath)) {
            if (assetDir === DEFAULT_ASSET_DIR) {
                continue;
            }
            throw new Error(`solid-build assets directory was not found at ${inputPath}`);
        }
        validateExistingPathTarget(cwd, inputPath, "assetsDirs entries", assetDir);

        if (!statSync(inputPath).isDirectory()) {
            throw new Error(`solid-build assets path must be a directory: ${inputPath}`);
        }

        const outputDirName = assetDir.replace(/\\/g, "/").split("/").filter(Boolean).at(-1);
        if (!outputDirName) {
            throw new Error(`solid-build assets directory must resolve to a directory name: ${assetDir}`);
        }

        if (resolved.some((dir) => dir.outputDirName === outputDirName)) {
            throw new Error(`solid-build assets directory name is duplicated: ${outputDirName}`);
        }

        resolved.push({ inputPath, outputDirName });
    }

    return resolved;
};

export const defineSolidBuildConfig = (config: SolidBuildConfig): SolidBuildConfig => config;

export const loadConfig = async (cwd: string = process.cwd()): Promise<LoadedSolidBuildConfig> => {
    const configPath = resolve(cwd, "./solid-build.config.ts");
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
        throw new Error(`solid-build app component was not found at ${appComponentPath}`);
    }
    validateExistingPathTarget(cwd, appComponentPath, "app component", mergedConfig.appComponent);
    if (!statSync(appComponentPath).isFile()) {
        throw new Error(`solid-build app component must be a file: ${appComponentPath}`);
    }

    await validateDefaultExport(appComponentPath);

    const outDirPath = validateOutDir(cwd, mergedConfig.outDir, mergedConfig.appComponent);
    const assetsDirs = resolveAssetsDirs(cwd, mergedConfig.assetsDirs);

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
    };
};
