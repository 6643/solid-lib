import { createSignal, flush, runWithOwner } from "solid-js";

import type { BrowserClickEvent } from "./browser";
import { resolveInternalRoutePath } from "./browser";
import { isFallbackRoutePath, matchesExactRoute, normalizePathname } from "./match";

const ROUTE_HISTORY_KEY = "__solid_route__";
const ROUTE_HISTORY_HOST_KEY = "__solid_route_host__";

type RouteHistoryMeta = {
    backPath?: string;
};

type RouteSnapshot = {
    hash: string;
    href: string;
    pathname: string;
    search: string;
};

type BrowserLike = {
    addEventListener?: (type: string, listener: (event: Event) => void) => void;
    removeEventListener?: (type: string, listener: (event: Event) => void) => void;
    document?: {
        addEventListener?: (type: string, listener: (event: BrowserClickEvent) => void) => void;
        removeEventListener?: (type: string, listener: (event: BrowserClickEvent) => void) => void;
    };
    history?: {
        state?: unknown;
        pushState?: (state: unknown, title: string, url?: string | URL | null) => void;
        replaceState?: (state: unknown, title: string, url?: string | URL | null) => void;
    };
    location?: {
        hash?: string;
        href?: string;
        origin?: string;
        pathname?: string;
        search?: string;
    };
};

type RegisteredRoute = {
    fallback: boolean;
    id: symbol;
    isEnabled: () => boolean;
    path: string;
};

const state = runWithOwner(null, () => {
    const [href, setHref] = createSignal("");
    const [pathname, setPathname] = createSignal("/");
    const [search, setSearch] = createSignal("");
    const [hash, setHash] = createSignal("");

    return {
        hash,
        href,
        pathname,
        search,
        setSnapshot(snapshot: RouteSnapshot) {
            latestSnapshot = snapshot;
            setHref(snapshot.href);
            setPathname(snapshot.pathname);
            setSearch(snapshot.search);
            setHash(snapshot.hash);
            flush();
        },
    };
});

let activeBrowser: BrowserLike | undefined;
let cleanupListeners: (() => void) | undefined;
let clickHandler: ((event: BrowserClickEvent) => void) | undefined;
let latestSnapshot: RouteSnapshot = {
    hash: "",
    href: "",
    pathname: "/",
    search: "",
};
const registeredRoutes = new Map<symbol, RegisteredRoute>();

const getBrowser = (): BrowserLike | undefined => (globalThis as Record<string, unknown>).window as BrowserLike | undefined;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === "object" && !Array.isArray(value);

const createSnapshot = (browser?: BrowserLike): RouteSnapshot => {
    const location = browser?.location;

    return {
        hash: location?.hash ?? "",
        href: location?.href ?? "",
        pathname: location?.pathname ?? "/",
        search: location?.search ?? "",
    };
};

const sanitizeBackPath = (backPath: unknown, origin: string, baseHref: string): string | undefined => {
    if (typeof backPath !== "string" || backPath.length === 0) {
        return undefined;
    }

    return resolveInternalRoutePath(backPath, baseHref, origin);
};

const readHistoryMeta = (historyState: unknown, origin: string, baseHref: string): RouteHistoryMeta => {
    if (!isPlainObject(historyState)) {
        return {};
    }

    const meta = historyState[ROUTE_HISTORY_KEY];
    if (!isPlainObject(meta)) {
        return {};
    }

    return {
        backPath: sanitizeBackPath(meta.backPath, origin, baseHref),
    };
};

const writeHistoryMeta = (historyState: unknown, meta: RouteHistoryMeta) => {
    if (isPlainObject(historyState)) {
        if (ROUTE_HISTORY_HOST_KEY in historyState) {
            const host = historyState[ROUTE_HISTORY_HOST_KEY];
            if (isPlainObject(host)) {
                return {
                    ...host,
                    [ROUTE_HISTORY_KEY]: meta,
                };
            }

            return {
                [ROUTE_HISTORY_KEY]: meta,
                [ROUTE_HISTORY_HOST_KEY]: host,
            };
        }

        return {
            ...historyState,
            [ROUTE_HISTORY_KEY]: meta,
        };
    }

    if (historyState === undefined || historyState === null) {
        return {
            [ROUTE_HISTORY_KEY]: meta,
        };
    }

    // Preserve array / primitive history state beside route metadata.
    return {
        [ROUTE_HISTORY_KEY]: meta,
        [ROUTE_HISTORY_HOST_KEY]: historyState,
    };
};

const currentInternalPath = () => `${state.pathname()}${state.search()}${state.hash()}`;

const getNavigationContext = (browser: BrowserLike) => {
    const origin = browser.location?.origin ?? "";
    const baseHref = browser.location?.href || (origin ? `${origin}/` : "");
    return { origin, baseHref };
};

const ensureCurrentEntryMeta = (browser: BrowserLike) => {
    const history = browser.history;
    const location = browser.location;

    if (!history?.replaceState || !location?.href) {
        return;
    }

    if (isPlainObject(history.state) && ROUTE_HISTORY_KEY in history.state) {
        return;
    }

    const { origin, baseHref } = getNavigationContext(browser);
    const existingMeta = readHistoryMeta(history.state, origin, baseHref);
    history.replaceState(writeHistoryMeta(history.state, existingMeta), "", location.href);
};

const syncFromBrowser = (browser?: BrowserLike) => {
    const snapshot = createSnapshot(browser);

    if (
        snapshot.href === latestSnapshot.href &&
        snapshot.pathname === latestSnapshot.pathname &&
        snapshot.search === latestSnapshot.search &&
        snapshot.hash === latestSnapshot.hash
    ) {
        return;
    }

    runWithOwner(null, () => {
        state.setSnapshot(snapshot);
    });
};

const navigateBrowserEntry = (
    mode: "push" | "replace",
    path: string,
    backPath: string | undefined,
) => {
    const browser = getBrowser();
    const location = browser?.location;
    const history = browser?.history;
    const historyMethod = mode === "push" ? history?.pushState : history?.replaceState;

    if (!browser || !location?.href || !historyMethod) {
        syncFromBrowser(undefined);
        return;
    }

    const { origin, baseHref } = getNavigationContext(browser);
    if (!origin) {
        syncFromBrowser(browser);
        return;
    }

    const resolvedPath = resolveInternalRoutePath(path, baseHref, origin);
    if (!resolvedPath) {
        throw new Error(`solid-lib route path must be a same-origin http(s) path: ${path}`);
    }

    const safeBackPath = sanitizeBackPath(backPath, origin, baseHref);
    // Push inherits the current entry's app state so SPA state is not wiped on navigation.
    const nextState = writeHistoryMeta(history?.state, { backPath: safeBackPath });
    historyMethod.call(history, nextState, "", resolvedPath);
    syncFromBrowser(browser);
};

export const ensureRouteState = (clickListener?: (event: BrowserClickEvent) => void) => {
    const browser = getBrowser();

    if (!browser) {
        cleanupListeners?.();
        cleanupListeners = undefined;
        activeBrowser = undefined;
        clickHandler = undefined;
        syncFromBrowser(undefined);
        return;
    }

    if (clickListener) {
        clickHandler = clickListener;
    }

    if (activeBrowser === browser) {
        ensureCurrentEntryMeta(browser);
        syncFromBrowser(browser);
        return;
    }

    cleanupListeners?.();

    activeBrowser = browser;
    const handlePopState = () => {
        syncFromBrowser(browser);
    };
    const handleClick = (event: BrowserClickEvent) => {
        clickHandler?.(event);
    };

    browser.addEventListener?.("popstate", handlePopState);
    browser.document?.addEventListener?.("click", handleClick);

    cleanupListeners = () => {
        browser.removeEventListener?.("popstate", handlePopState);
        browser.document?.removeEventListener?.("click", handleClick);
    };

    ensureCurrentEntryMeta(browser);
    syncFromBrowser(browser);
};

export const replaceBrowserEntry = (path: string, backPath: string | undefined) => {
    navigateBrowserEntry("replace", path, backPath);
};

export const pushBrowserEntry = (path: string, backPath: string | undefined) => {
    navigateBrowserEntry("push", path, backPath);
};

export const getCurrentPathname = () => state.pathname();

export const getCurrentSearch = () => state.search();

export const getCurrentHref = () => state.href();

export const getCurrentHash = () => state.hash();

export const getCurrentOrigin = () => activeBrowser?.location?.origin ?? getBrowser()?.location?.origin ?? "";

export const getCurrentBackPath = () => {
    const browser = activeBrowser ?? getBrowser();
    if (!browser) {
        return undefined;
    }

    const { origin, baseHref } = getNavigationContext(browser);
    if (!origin || !baseHref) {
        return undefined;
    }

    return readHistoryMeta(browser.history?.state, origin, baseHref).backPath;
};

export const getCurrentInternalPath = () => currentInternalPath();

export const registerRoute = (route: Omit<RegisteredRoute, "id">) => {
    const id = Symbol("route");
    const path = isFallbackRoutePath(route.path) ? route.path : normalizePathname(route.path);
    registeredRoutes.set(id, {
        ...route,
        id,
        path,
        fallback: route.fallback || isFallbackRoutePath(route.path),
    });
    return id;
};

export const unregisterRoute = (id: symbol) => {
    registeredRoutes.delete(id);
};

export const hasActiveExactRoute = (pathname: string) => {
    for (const route of registeredRoutes.values()) {
        if (route.fallback || !route.isEnabled()) {
            continue;
        }

        if (matchesExactRoute(route.path, pathname)) {
            return true;
        }
    }

    return false;
};

export const hasActiveFallbackRoute = () => {
    for (const route of registeredRoutes.values()) {
        if (!route.fallback || !route.isEnabled()) {
            continue;
        }

        return true;
    }

    return false;
};

export const resetRouteStateForTests = () => {
    cleanupListeners?.();
    cleanupListeners = undefined;
    activeBrowser = undefined;
    clickHandler = undefined;
    registeredRoutes.clear();

    const snapshot = createSnapshot(getBrowser());
    latestSnapshot = {
        hash: "",
        href: "",
        pathname: "/",
        search: "",
    };

    runWithOwner(null, () => {
        state.setSnapshot(snapshot);
    });
};
