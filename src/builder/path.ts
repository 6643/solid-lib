import { accessSync, constants, existsSync, mkdirSync, realpathSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const isSameOrSubpath = (targetPath: string, basePath: string): boolean => {
    const relativePath = relative(basePath, targetPath);
    return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
};

/** Reject absolute paths, empty segments, and `..` so write targets stay under baseDir. */
export const resolveContainedOutputPath = (baseDir: string, relativePath: string): string => {
    const normalized = relativePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();

    if (!normalized || isAbsolute(normalized) || normalized.startsWith("/")) {
        throw new Error(`solid-lib build output path must be a relative path under the outdir: ${relativePath}`);
    }

    const segments = normalized.split("/").filter((segment) => segment.length > 0);
    if (segments.some((segment) => segment === ".." || segment === ".")) {
        throw new Error(`solid-lib build output path must not contain relative segments: ${relativePath}`);
    }

    const targetPath = resolve(baseDir, ...segments);
    if (!isSameOrSubpath(targetPath, resolve(baseDir))) {
        throw new Error(`solid-lib build output path escapes the outdir: ${relativePath}`);
    }

    return targetPath;
};

/** Atomically replace targetDir with sourceDir (backup + rename, restore on failure). */
export const replaceDirectory = (sourceDir: string, targetDir: string, backupPrefix = ".solid-lib-prev-"): void => {
    const parentDir = dirname(targetDir);
    mkdirSync(parentDir, { recursive: true });

    const backupDir = existsSync(targetDir) ? join(parentDir, `${backupPrefix}${process.hrtime.bigint()}`) : undefined;

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

export const resolveExistingRealPath = (targetPath: string): string =>
    realpathSync.native?.(targetPath) ?? realpathSync(targetPath);

const canWritePath = (targetPath: string): boolean => {
    try {
        accessSync(targetPath, constants.W_OK);
        return true;
    } catch (_error) {
        return false;
    }
};

export const findNearestNodeModulesPath = (startPath: string): string | undefined => {
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

export const findWritableAncestorPath = (startPath: string): string | undefined => {
    let currentPath = resolve(startPath);

    while (true) {
        if (canWritePath(currentPath)) {
            return currentPath;
        }

        const parentPath = dirname(currentPath);
        if (parentPath === currentPath) {
            return undefined;
        }
        currentPath = parentPath;
    }
};

export const findNearestExistingPath = (targetPath: string): string | undefined => {
    let currentPath = resolve(targetPath);

    while (!existsSync(currentPath)) {
        const parentPath = dirname(currentPath);
        if (parentPath === currentPath) {
            return undefined;
        }
        currentPath = parentPath;
    }

    return currentPath;
};

export const getProjectRelativeSegments = (cwd: string, targetPath: string): string[] =>
    relative(cwd, targetPath).replace(/\\/g, "/").split("/").filter(Boolean);

export const validateProjectRootPath = (cwd: string, targetPath: string, label: string, originalPath: string): void => {
    if (!isSameOrSubpath(targetPath, cwd)) {
        throw new Error(`solid-lib ${label} must stay inside the project root: ${originalPath}`);
    }
};

export const validateExistingPathTarget = (cwd: string, targetPath: string, label: string, originalPath: string): void => {
    const realTargetPath = resolveExistingRealPath(targetPath);
    if (!isSameOrSubpath(realTargetPath, cwd)) {
        throw new Error(`solid-lib ${label} must stay inside the project root: ${originalPath}`);
    }
};

export const toFileUrlHref = (filePath: string): string => pathToFileURL(resolve(filePath)).href;
