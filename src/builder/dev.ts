#!/usr/bin/env bun

import { existsSync, readdirSync, statSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join, relative, resolve, sep } from "node:path";

import type { LoadedSolidBuildConfig } from "./config";
import { loadConfig } from "./config";
import { buildAppBundle, getAssetContentType } from "./bundle";

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
    body: Uint8Array | string;
    contentType: string;
}

interface InMemoryCompilation {
    assets: Map<string, InMemoryAsset>;
    html: string;
}

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

    return !pathname.split("/").at(-1)?.includes(".");
};

const listFiles = (rootPath: string): string[] => {
    if (!existsSync(rootPath)) {
        return [];
    }

    const stats = statSync(rootPath);
    if (stats.isFile()) {
        return [rootPath];
    }

    const files: string[] = [];
    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
        const fullPath = join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(fullPath));
            continue;
        }
        files.push(fullPath);
    }
    return files;
};

const isSameOrSubpath = (targetPath: string, basePath: string): boolean => {
    const relativePath = relative(basePath, targetPath);
    return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== "..");
};

const createWatchSignature = ({ config, configDependencyPaths, cwd }: LoadedSolidBuildConfig): string => {
    const roots = new Set<string>([
        resolve(cwd, "./solid-build.config.ts"),
        ...configDependencyPaths,
        config.appSourceRootPath,
        ...config.assetsDirs.map((assetDir) => assetDir.inputPath),
    ]);

    return Array.from(roots)
        .flatMap((root) => listFiles(root))
        .sort()
        .map((filePath) => {
            const stats = statSync(filePath);
            return `${filePath}:${stats.size}:${stats.mtimeMs}`;
        })
        .join("|");
};

const buildDevCompilation = async (loadedConfig: LoadedSolidBuildConfig): Promise<InMemoryCompilation> => {
    const bundle = await buildAppBundle(loadedConfig, { development: true, minify: false, sourcemap: "inline" });
    const assets = new Map<string, InMemoryAsset>();

    for (const output of bundle.assets) {
        const bytes = new Uint8Array(await output.artifact.arrayBuffer());
        assets.set(output.path, {
            body: bytes,
            contentType: getAssetContentType(output.path, output.artifact),
        });
    }

    return { assets, html: injectDevClient(bundle.html) };
};

export const startDevServer = async (
    loadedConfig: LoadedSolidBuildConfig,
    options: StartDevServerOptions = {},
): Promise<StartedDevServer> => {
    const host = options.host ?? "127.0.0.1";
    const hasExplicitPort = options.port !== undefined;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const clients = new Set<ReadableStreamDefaultController<string>>();
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
                    `solid-dev devPort change requires restarting solid-dev to take effect (${currentConfig.config.devPort} -> ${nextConfig.config.devPort})`,
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
        fetch: (request) => {
            const url = new URL(request.url);
            const pathname = url.pathname === "/index.html" ? "/" : url.pathname;

            if (pathname === "/") {
                return new Response(currentBuild.html, {
                    headers: {
                        "content-type": "text/html; charset=utf-8",
                        "cache-control": "no-store",
                    },
                });
            }

            if (pathname === DEV_EVENTS_PATH) {
                return new Response(
                    new ReadableStream<string>({
                        start(controller) {
                            clients.add(controller);
                            controller.enqueue("retry: 1000\n\n");
                        },
                        cancel() {
                            for (const client of clients) {
                                if (client.desiredSize === null) {
                                    clients.delete(client);
                                }
                            }
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
            }

            const assetPath = pathname.replace(/^\//, "");
            const asset = currentBuild.assets.get(assetPath);
            if (asset) {
                const body = typeof asset.body === "string" ? asset.body : (asset.body as BodyInit);
                return new Response(body, {
                    headers: {
                        "content-type": asset.contentType,
                        "cache-control": "no-store",
                    },
                });
            }

            for (const assetsDir of currentConfig.config.assetsDirs) {
                const prefix = `${assetsDir.outputDirName}/`;
                if (!assetPath.startsWith(prefix)) {
                    continue;
                }

                const requestedPath = resolve(assetsDir.inputPath, assetPath.slice(prefix.length));
                if (
                    !isSameOrSubpath(requestedPath, assetsDir.inputPath) ||
                    !existsSync(requestedPath) ||
                    !statSync(requestedPath).isFile()
                ) {
                    return new Response("Not found", { status: 404 });
                }
                return new Response(Bun.file(requestedPath));
            }

            if (isSpaRequest(request, pathname)) {
                return new Response(currentBuild.html, {
                    headers: {
                        "content-type": "text/html; charset=utf-8",
                        "cache-control": "no-store",
                    },
                });
            }

            return new Response("Not found", { status: 404 });
        },
        hostname: host,
        port: options.port ?? currentConfig.config.devPort ?? 0,
    });
    const port = server.port ?? Number(server.url.port);

    if (!Number.isFinite(port) || port <= 0) {
        throw new Error("solid-dev failed to resolve a TCP port");
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

const main = async (): Promise<void> => {
    const loadedConfig = await loadConfig(process.cwd());
    const server = await startDevServer(loadedConfig, { host: "0.0.0.0" });

    console.log("Dev server running");
    console.log("");
    console.log(`- Local:   http://127.0.0.1:${server.port}`);

    for (const origin of getNetworkOrigins(server.port)) {
        console.log(`- Network: ${origin}`);
    }
};

if (import.meta.main) {
    await main();
}
