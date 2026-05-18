import { accessSync, constants, existsSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const isSameOrSubpath = (targetPath: string, basePath: string): boolean => {
    const relativePath = relative(basePath, targetPath);
    return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
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
        throw new Error(`solid-build ${label} must stay inside the project root: ${originalPath}`);
    }
};

export const validateExistingPathTarget = (cwd: string, targetPath: string, label: string, originalPath: string): void => {
    const realTargetPath = resolveExistingRealPath(targetPath);
    if (!isSameOrSubpath(realTargetPath, cwd)) {
        throw new Error(`solid-build ${label} must stay inside the project root: ${originalPath}`);
    }
};

export const toFileUrlHref = (filePath: string): string => {
    const url = new URL("file:///");
    url.pathname = resolve(filePath).replace(/%/g, "%25").replace(/\\/g, "/");
    return url.href;
};
