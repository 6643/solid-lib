import {
    ensureRouteState,
    getCurrentBackPath,
    getCurrentHref,
    getCurrentInternalPath,
    getCurrentOrigin,
    hasActiveExactRoute,
    hasActiveFallbackRoute,
    pushBrowserEntry,
    replaceBrowserEntry,
} from "./state";
import {
    type AnchorLike,
    type BrowserClickEvent,
    findAnchor,
    parseUrl,
    resolveInternalRoutePath,
    toInternalPath,
} from "./browser";

const isPrimaryPlainClick = (event: BrowserClickEvent) => {
    if (event.defaultPrevented) {
        return false;
    }

    if (event.button !== undefined && event.button !== 0) {
        return false;
    }

    return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
};

/** Intercept when target is absent, empty, or _self; leave real browsing contexts to the browser. */
const hasBrowserManagedTarget = (anchor: AnchorLike) => {
    const rawTarget = anchor.getAttribute?.("target") ?? anchor.target;
    const target = typeof rawTarget === "string" ? rawTarget.trim() : "";

    if (target && target.toLowerCase() !== "_self") {
        return true;
    }

    return typeof anchor.getAttribute === "function" && anchor.getAttribute("download") !== null;
};

const isHashOnlyChange = (nextUrl: URL, currentUrl: URL) =>
    nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search && nextUrl.hash !== currentUrl.hash;

const getInterceptableAnchorUrl = (event: BrowserClickEvent, anchor: AnchorLike | undefined) => {
    if (!anchor || event.defaultPrevented) {
        return undefined;
    }

    if (!isPrimaryPlainClick(event) || hasBrowserManagedTarget(anchor)) {
        return undefined;
    }

    const currentOrigin = getCurrentOrigin();
    if (!currentOrigin) {
        return undefined;
    }

    const nextUrl = parseUrl(anchor.href, currentOrigin);
    if (!nextUrl || nextUrl.origin !== currentOrigin) {
        return undefined;
    }

    // Only handle http(s) same-origin navigations; leave javascript:/data:/mailto: alone.
    if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
        return undefined;
    }

    const currentUrl = parseUrl(getCurrentInternalPath(), `${currentOrigin}/`);
    if (!currentUrl) {
        return undefined;
    }
    if (isHashOnlyChange(nextUrl, currentUrl)) {
        return undefined;
    }

    return nextUrl;
};

const requireInternalRoutePath = (path: string): string => {
    const origin = getCurrentOrigin();
    if (!origin) {
        // No browser context: keep a path-shaped string for callers that only track signals.
        return path || "/";
    }

    // Resolve relative segments against the current location, not only the origin root.
    const baseHref = getCurrentHref() || `${origin}/`;
    const resolved = resolveInternalRoutePath(path, baseHref, origin);
    if (!resolved) {
        throw new Error(`solid-lib route path must be a same-origin http(s) path: ${path}`);
    }

    return resolved;
};

const canRouteToPath = (pathname: string) => hasActiveExactRoute(pathname) || hasActiveFallbackRoute();

export const pushRoute = (path: string) => {
    ensureRouteState(handleAnchorClick);
    pushBrowserEntry(requireInternalRoutePath(path), getCurrentInternalPath());
};

export const replaceRoute = (path: string) => {
    ensureRouteState(handleAnchorClick);
    replaceBrowserEntry(requireInternalRoutePath(path), getCurrentBackPath());
};

export const getRouteBackPath = () => {
    ensureRouteState(handleAnchorClick);
    return getCurrentBackPath();
};

export const handleAnchorClick = (event: BrowserClickEvent) => {
    const anchor = findAnchor(event);
    const nextUrl = getInterceptableAnchorUrl(event, anchor);
    if (!nextUrl) {
        return;
    }

    if (!canRouteToPath(nextUrl.pathname)) {
        return;
    }

    event.preventDefault?.();
    pushRoute(toInternalPath(nextUrl));
};
