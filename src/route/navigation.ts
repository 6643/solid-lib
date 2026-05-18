import {
    ensureRouteState,
    getCurrentBackPath,
    getCurrentInternalPath,
    getCurrentOrigin,
    hasActiveExactRoute,
    hasActiveFallbackRoute,
    pushBrowserEntry,
    replaceBrowserEntry,
} from "./state";
import { type AnchorLike, type BrowserClickEvent, findAnchor, parseUrl } from "./browser";

const isPrimaryPlainClick = (event: BrowserClickEvent) => {
    if (event.defaultPrevented) {
        return false;
    }

    if (event.button !== undefined && event.button !== 0) {
        return false;
    }

    return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
};

const hasBrowserManagedTarget = (anchor: AnchorLike) => {
    if (anchor.target || anchor.getAttribute?.("target")) {
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
    if (!nextUrl) {
        return undefined;
    }
    if (nextUrl.origin !== currentOrigin) {
        return undefined;
    }

    const currentUrl = parseUrl(getCurrentInternalPath() || "/", `${currentOrigin}/`);
    if (!currentUrl) {
        return undefined;
    }
    if (isHashOnlyChange(nextUrl, currentUrl)) {
        return undefined;
    }

    return nextUrl;
};

const toInternalPath = (path: string) => path || "/";

const canRouteToPath = (pathname: string) => hasActiveExactRoute(pathname) || hasActiveFallbackRoute();

export const pushRoute = (path: string) => {
    ensureRouteState(handleAnchorClick);
    pushBrowserEntry(toInternalPath(path), getCurrentInternalPath());
};

export const replaceRoute = (path: string) => {
    ensureRouteState(handleAnchorClick);
    replaceBrowserEntry(toInternalPath(path), getCurrentBackPath());
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
    pushRoute(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
};
