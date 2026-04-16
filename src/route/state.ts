import { createSignal, flush, runWithOwner } from "solid-js";

import { isFallbackRoutePath, matchesExactRoute } from "./match";

const ROUTE_HISTORY_KEY = "__solid_route__";

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
    addEventListener?: (type: string, listener: (event: any) => void) => void;
    removeEventListener?: (type: string, listener: (event: any) => void) => void;
    document?: {
        addEventListener?: (type: string, listener: (event: any) => void) => void;
        removeEventListener?: (type: string, listener: (event: any) => void) => void;
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
let clickHandler: ((event: any) => void) | undefined;
let latestSnapshot: RouteSnapshot = {
    hash: "",
    href: "",
    pathname: "/",
    search: "",
};
const registeredRoutes = new Map<symbol, RegisteredRoute>();

const getBrowser = (): BrowserLike | undefined => (globalThis as Record<string, unknown>).window as BrowserLike | undefined;

const createSnapshot = (browser?: BrowserLike): RouteSnapshot => {
    const location = browser?.location;

    return {
        hash: location?.hash ?? "",
        href: location?.href ?? "",
        pathname: location?.pathname ?? "/",
        search: location?.search ?? "",
    };
};

const readHistoryMeta = (state: unknown): RouteHistoryMeta => {
    if (!state || typeof state !== "object") {
        return {};
    }

    const meta = (state as Record<string, unknown>)[ROUTE_HISTORY_KEY];
    if (!meta || typeof meta !== "object") {
        return {};
    }

    const backPath = (meta as Record<string, unknown>).backPath;
    return {
        backPath: typeof backPath === "string" ? backPath : undefined,
    };
};

const hasHistoryMeta = (state: unknown) =>
    !!state && typeof state === "object" && ROUTE_HISTORY_KEY in (state as Record<string, unknown>);

const writeHistoryMeta = (state: unknown, meta: RouteHistoryMeta) => {
    if (state && typeof state === "object" && !Array.isArray(state)) {
        return {
            ...(state as Record<string, unknown>),
            [ROUTE_HISTORY_KEY]: meta,
        };
    }

    return {
        [ROUTE_HISTORY_KEY]: meta,
    };
};

const currentInternalPath = () => `${state.pathname()}${state.search()}${state.hash()}`;

const ensureCurrentEntryMeta = (browser: BrowserLike) => {
    const history = browser.history;
    const location = browser.location;

    if (!history?.replaceState || !location?.href) {
        return;
    }

    if (hasHistoryMeta(history.state)) {
        return;
    }

    const existingMeta = readHistoryMeta(history.state);
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

export const ensureRouteState = (clickListener?: (event: any) => void) => {
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
    const handleClick = (event: any) => {
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
    const browser = getBrowser();
    const location = browser?.location;
    const history = browser?.history;

    if (!browser || !location?.href || !history?.replaceState) {
        syncFromBrowser(undefined);
        return;
    }

    const nextUrl = new URL(path, location.href);
    history.replaceState(writeHistoryMeta(history.state, { backPath }), "", nextUrl.href);
    syncFromBrowser(browser);
};

export const pushBrowserEntry = (path: string, backPath: string | undefined) => {
    const browser = getBrowser();
    const location = browser?.location;
    const history = browser?.history;

    if (!browser || !location?.href || !history?.pushState) {
        syncFromBrowser(undefined);
        return;
    }

    const nextUrl = new URL(path, location.href);
    history.pushState(writeHistoryMeta(undefined, { backPath }), "", nextUrl.href);
    syncFromBrowser(browser);
};

export const getCurrentPathname = () => state.pathname();

export const getCurrentSearch = () => state.search();

export const getCurrentHref = () => state.href();

export const getCurrentHash = () => state.hash();

export const getCurrentOrigin = () => activeBrowser?.location?.origin ?? getBrowser()?.location?.origin ?? "";

export const getCurrentBackPath = () => readHistoryMeta(activeBrowser?.history?.state).backPath;

export const getCurrentInternalPath = () => currentInternalPath();

export const registerRoute = (route: Omit<RegisteredRoute, "id">) => {
    const id = Symbol("route");
    registeredRoutes.set(id, {
        ...route,
        id,
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
