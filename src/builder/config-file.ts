import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import * as ts from "typescript";

import type { SolidBuildConfig } from "./config";
import {
    findNearestNodeModulesPath,
    findWritableAncestorPath,
    toFileUrlHref,
    validateExistingPathTarget,
    validateProjectRootPath,
} from "./path";

const CONFIG_IMPORT_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

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

const getStaticModuleSpecifier = (node: ts.Node): string | undefined => {
    if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) {
        return undefined;
    }

    const moduleSpecifier = node.moduleSpecifier;
    if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier) || !moduleSpecifier.text.startsWith(".")) {
        return undefined;
    }

    return moduleSpecifier.text;
};

const getDynamicModuleSpecifier = (node: ts.Node): string | undefined => {
    if (!ts.isCallExpression(node) || node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
        return undefined;
    }

    const [firstArgument] = node.arguments;
    if (!firstArgument || !ts.isStringLiteral(firstArgument) || !firstArgument.text.startsWith(".")) {
        return undefined;
    }

    return firstArgument.text;
};

const getRelativeModuleSpecifier = (node: ts.Node): string | undefined =>
    getStaticModuleSpecifier(node) ?? getDynamicModuleSpecifier(node);

const getRelativeModuleSpecifiers = (sourceFile: ts.SourceFile): string[] => {
    const specifiers = new Set<string>();

    const visit = (node: ts.Node): void => {
        const specifier = getRelativeModuleSpecifier(node);
        if (specifier) {
            specifiers.add(specifier);
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

    throw new Error(`solid-lib config import was not found: ${specifier} from ${fromPath}`);
};

const collectConfigDependencyPaths = async (configPath: string, cwd: string): Promise<string[]> => {
    const visited = new Set<string>();
    const queue = [configPath];

    while (queue.length > 0) {
        const currentPath = queue.pop()!;
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

export const loadUserConfig = async (
    configPath: string,
    cwd: string,
): Promise<{ config: SolidBuildConfig; dependencyPaths: string[] }> => {
    const dependencyPaths = await collectConfigDependencyPaths(configPath, cwd);
    const stagingBasePath = findWritableAncestorPath(cwd) ?? tmpdir();
    const tempRoot = mkdtempSync(join(stagingBasePath, ".solid-lib-config-"));
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
            throw new Error(`solid-lib config at ${configPath} must export a default config object`);
        }

        if (typeof userConfig !== "object" || Array.isArray(userConfig)) {
            throw new Error(`solid-lib config at ${configPath} must export an object`);
        }

        return { config: userConfig, dependencyPaths };
    } finally {
        rmSync(tempRoot, { force: true, recursive: true });
    }
};
