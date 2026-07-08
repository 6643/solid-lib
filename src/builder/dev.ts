#!/usr/bin/env bun

import { lstatSync, readdirSync, statSync, type Dirent, type Stats } from "node:fs";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";

import type { LoadedSolidBuildConfig } from "./config";
import { loadConfig } from "./config";
import { buildAppBundle, getAssetContentType } from "./bundle";
import { isSameOrSubpath, resolveExistingRealPath } from "./path";

export interface StartDevServerOptions {
    host?: string;
    port?: number;
    pollIntervalMs?: number;
}

export interface StartedDevServer {
    origin: string;
    port: number;
    stop: () => void;
}

interface InMemoryAsset {
    body: ArrayBuffer | string;
    contentType: string;
}

interface InMemoryCompilation {
    assets: Map<string, InMemoryAsset>;
    html: string;
}

type DevClientController = ReadableStreamDefaultController<string>;

const DEV_EVENTS_PATH = "/__solid_dev/events";
const DEFAULT_POLL_INTERVAL_MS = 300;
const DEV_CLIENT_SNIPPET = [
    "  <script>",
    `    const source = new EventSource(${JSON.stringify(DEV_EVENTS_PATH)});`,
    "    const reload = () => {",
    "      source.close();",
    "      location.reload();",
    "    };",
    '    source.addEventListener("reload", reload);',
    '    addEventListener("beforeunload", () => source.close(), { once: true });',
    "  </script>",
].join("\n");

const injectDevClient = (html: string): string => html.replace("</body>", `${DEV_CLIENT_SNIPPET}\n</body>`);

const isSpaRequest = (request: Request, pathname: string): boolean => {
    if (request.method !== "GET" && request.method !== "HEAD") {
        return false;
    }

    if (pathname === DEV_EVENTS_PATH || pathname.startsWith("/assets/")) {
        return false;
    }

    // SPA fallback: treat as SPA when last segment has no dot (no file extension).
    // Known limitation: paths like /users/john.doe are not treated as SPA routes.
    const lastSegment = pathname.split("/").at(-1) ?? "";
    return !lastSegment.includes(".");
};

const safeLstat = (filePath: string): Stats | undefined => {
    try {
        return lstatSync(filePath);
    } catch (_error) {
        return undefined;
    }
};

const safeStat = (filePath: string): Stats | undefined => {
    try {
        return statSync(filePath);
    } catch (_error) {
        return undefined;
    }
};

const safeReadDir = (dirPath: string): Dirent[] => {
    try {
        return readdirSync(dirPath, { withFileTypes: true });
    } catch (_error) {
        return [];
    }
};

const safeRealPath = (filePath: string): string | undefined => {
    try {
        return resolveExistingRealPath(filePath);
    } catch (_error) {
        return undefined;
    }
};

const listFiles = (rootPath: string): string[] => {
    const files: string[] = [];
    const pendingPaths = [rootPath];

    while (pendingPaths.length > 0) {
        const currentPath = pendingPaths.pop()!;
        const stats = safeLstat(currentPath);
        if (!stats) {
            continue;
        }

        if (stats.isFile() || stats.isSymbolicLink()) {
            files.push(currentPath);
            continue;
        }

        if (!stats.isDirectory()) {
            continue;
        }

        for (const entry of safeReadDir(currentPath)) {
            pendingPaths.push(join(currentPath, entry.name));
        }
    }

    return files;
};

const createWatchSignature = ({ config, configDependencyPaths, cwd, sourceRootPath, watchDirs }: LoadedSolidBuildConfig): string => {
    const roots = new Set<string>([
        resolve(cwd, "./config.ts"),
        ...configDependencyPaths,
        sourceRootPath,
        ...config.assetsDirs.map((assetDir) => assetDir.inputPath),
        ...watchDirs.map((dir) => resolve(cwd, dir)),
    ]);

    return Array.from(roots)
        .flatMap((root) => listFiles(root))
        .sort()
        .map((filePath) => [filePath, safeLstat(filePath)] as const)
        .filter((entry): entry is readonly [string, Stats] => entry[1] !== undefined)
        .map(([filePath, stats]) => `${filePath}:${stats.size}:${stats.mtimeMs}`)
        .join("|");
};

const buildDevCompilation = async (loadedConfig: LoadedSolidBuildConfig): Promise<InMemoryCompilation> => {
    const bundle = await buildAppBundle(loadedConfig, { development: true, minify: false, sourcemap: "inline" });
    const assets = new Map<string, InMemoryAsset>();

    for (const output of bundle.assets) {
        assets.set(output.path, {
            body: await output.artifact.arrayBuffer(),
            contentType: getAssetContentType(output.path, output.artifact),
        });
    }

    return { assets, html: injectDevClient(bundle.html) };
};

const createNoStoreResponse = (body: BodyInit, contentType: string): Response =>
    new Response(body, {
        headers: {
            "content-type": contentType,
            "cache-control": "no-store",
        },
    });

const createHtmlResponse = (html: string): Response => createNoStoreResponse(html, "text/html; charset=utf-8");

const createBundledAssetResponse = (asset: InMemoryAsset): Response => createNoStoreResponse(asset.body, asset.contentType);

const getRequestKind = (pathname: string): string => {
    if (pathname === "/" || pathname === "/index.html") {
        return "document";
    }
    if (pathname === DEV_EVENTS_PATH) {
        return "event-stream";
    }
    if (pathname.endsWith(".js") || pathname.endsWith(".mjs") || pathname.endsWith(".ts") || pathname.endsWith(".tsx")) {
        return "script";
    }
    if (pathname.endsWith(".css")) {
        return "style";
    }
    if (pathname.startsWith("/assets/")) {
        return "asset";
    }
    return "other";
};

const logDevRequest = (request: Request, pathname: string) => {
    console.log(`[dev] ${request.method} ${pathname} (${getRequestKind(pathname)})`);
};

const pruneDisconnectedClients = (clients: Set<DevClientController>): void => {
    for (const client of clients) {
        if (client.desiredSize === null) {
            clients.delete(client);
        }
    }
};

const createDevEventsResponse = (clients: Set<DevClientController>): Response =>
    new Response(
        new ReadableStream<string>({
            start(controller) {
                clients.add(controller);
                controller.enqueue("retry: 1000\n\n");
            },
            cancel() {
                pruneDisconnectedClients(clients);
            },
        }),
        {
            headers: {
                "cache-control": "no-store",
                connection: "keep-alive",
                "content-type": "text/event-stream; charset=utf-8",
            },
        },
    );

const createSourceAssetResponse = (assetPath: string, loadedConfig: LoadedSolidBuildConfig): Response | undefined => {
    for (const assetsDir of loadedConfig.config.assetsDirs) {
        const prefix = `${assetsDir.outputDirName}/`;
        if (!assetPath.startsWith(prefix)) {
            continue;
        }

        const requestedPath = resolve(assetsDir.inputPath, assetPath.slice(prefix.length));
        const assetsRootPath = safeRealPath(assetsDir.inputPath);
        const requestedStats = safeStat(requestedPath);
        const requestedRealPath = safeRealPath(requestedPath);
        if (
            !isSameOrSubpath(requestedPath, assetsDir.inputPath) ||
            !assetsRootPath ||
            !requestedStats?.isFile() ||
            !requestedRealPath ||
            !isSameOrSubpath(requestedRealPath, assetsRootPath)
        ) {
            return new Response("Not found", { status: 404 });
        }

        return new Response(Bun.file(requestedPath));
    }

    return undefined;
};

export const startDevServer = async (
    loadedConfig: LoadedSolidBuildConfig,
    options: StartDevServerOptions = {},
): Promise<StartedDevServer> => {
    const host = options.host ?? "127.0.0.1";
    const hasExplicitPort = options.port !== undefined;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const clients = new Set<DevClientController>();
    let currentConfig = loadedConfig;
    let currentBuild = await buildDevCompilation(currentConfig);
    let disposed = false;
    let rebuilding = false;
    let pendingRebuild = false;
    let previousSignature = createWatchSignature(currentConfig);

    const broadcastReload = () => {
        for (const client of clients) {
            try {
                client.enqueue("event: reload\ndata: now\n\n");
            } catch {
                clients.delete(client);
            }
        }
    };

    const rebuild = async () => {
        if (rebuilding) {
            pendingRebuild = true;
            return;
        }

        rebuilding = true;
        try {
            const nextConfig = await loadConfig(currentConfig.cwd);
            const nextBuild = await buildDevCompilation(nextConfig);
            if (!hasExplicitPort && nextConfig.config.devPort !== currentConfig.config.devPort) {
                console.warn(
                    `solid-lib devPort change requires restarting solid-lib dev to take effect (${currentConfig.config.devPort} -> ${nextConfig.config.devPort})`,
                );
            }

            currentConfig = nextConfig;
            currentBuild = nextBuild;
            previousSignature = createWatchSignature(currentConfig);
            broadcastReload();
        } catch (error) {
            console.error(error);
        } finally {
            rebuilding = false;
            if (pendingRebuild) {
                pendingRebuild = false;
                void rebuild();
            }
        }
    };

    const pollTimer = setInterval(() => {
        if (disposed) {
            return;
        }

        const nextSignature = createWatchSignature(currentConfig);
        if (nextSignature !== previousSignature) {
            previousSignature = nextSignature;
            void rebuild();
        }
    }, pollIntervalMs);

    const server = Bun.serve({
        development: true,
        idleTimeout: 0,
        fetch: (request) => {
            const url = new URL(request.url);
            const pathname = url.pathname === "/index.html" ? "/" : url.pathname;
            logDevRequest(request, pathname);

            if (pathname === "/") {
                return createHtmlResponse(currentBuild.html);
            }

            if (pathname === DEV_EVENTS_PATH) {
                return createDevEventsResponse(clients);
            }

            const assetPath = pathname.replace(/^\//, "");
            const asset = currentBuild.assets.get(assetPath);
            if (asset) {
                console.log(`[dev] -> ${assetPath} (${asset.contentType})`);
                return createBundledAssetResponse(asset);
            }

            const sourceAssetResponse = createSourceAssetResponse(assetPath, currentConfig);
            if (sourceAssetResponse) {
                console.log(`[dev] -> ${assetPath} (source asset)`);
                return sourceAssetResponse;
            }

            if (isSpaRequest(request, pathname)) {
                return createHtmlResponse(currentBuild.html);
            }

            return new Response("Not found", { status: 404 });
        },
        hostname: host,
        port: options.port ?? currentConfig.config.devPort ?? 0,
    });
    const port = server.port ?? Number(server.url.port);

    if (!Number.isFinite(port) || port <= 0) {
        throw new Error("solid-lib dev failed to resolve a TCP port");
    }

    return {
        origin: server.url.origin,
        port,
        stop: () => {
            disposed = true;
            clearInterval(pollTimer);
            clients.clear();
            server.stop(true);
        },
    };
};

const getNetworkOrigins = (port: number): string[] => {
    const interfaces = networkInterfaces();
    const origins = new Set<string>();

    for (const entries of Object.values(interfaces)) {
        for (const entry of entries ?? []) {
            if (entry.internal || entry.family !== "IPv4") {
                continue;
            }
            origins.add(`http://${entry.address}:${port}`);
        }
    }

    return Array.from(origins).sort();
};

export const runDevCommand = async (cwd: string = process.cwd()): Promise<StartedDevServer> => {
    const loadedConfig = await loadConfig(cwd);
    const server = await startDevServer(loadedConfig, { host: "0.0.0.0" });

    console.log("Dev server running");
    console.log("");
    console.log(`- Local:   http://127.0.0.1:${server.port}`);

    for (const origin of getNetworkOrigins(server.port)) {
        console.log(`- Network: ${origin}`);
    }

    return server;
};

if (import.meta.main) {
    await runDevCommand();
}
