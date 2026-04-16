import { ensureRouteState, getCurrentBackPath, getCurrentInternalPath, getCurrentOrigin, hasActiveExactRoute, hasActiveFallbackRoute, pushBrowserEntry, replaceBrowserEntry } from "./state";

type AnchorLike = {
  download?: string;
  getAttribute?: (name: string) => string | null;
  hash?: string;
  href: string;
  origin?: string;
  pathname?: string;
  search?: string;
  target?: string;
};

const isAnchorLike = (value: unknown): value is AnchorLike => !!value && typeof value === "object" && typeof (value as AnchorLike).href === "string";

const findAnchor = (event: any): AnchorLike | undefined => {
  const path = typeof event?.composedPath === "function" ? event.composedPath() : [];

  for (const entry of path) {
    if (isAnchorLike(entry)) {
      return entry;
    }

    const closest = entry?.closest?.("a[href]");
    if (isAnchorLike(closest)) {
      return closest;
    }
  }

  const target = event?.target;
  if (isAnchorLike(target)) {
    return target;
  }

  const closest = target?.closest?.("a[href]");
  return isAnchorLike(closest) ? closest : undefined;
};

const shouldHandleAnchorClick = (event: any, anchor: AnchorLike | undefined) => {
  if (!anchor || event?.defaultPrevented) {
    return false;
  }

  if (event?.button !== 0) {
    return false;
  }

  if (event?.metaKey || event?.ctrlKey || event?.shiftKey || event?.altKey) {
    return false;
  }

  if (anchor.target || anchor.getAttribute?.("target")) {
    return false;
  }

  if (anchor.getAttribute?.("download") !== null) {
    return false;
  }

  const currentOrigin = getCurrentOrigin();
  if (!currentOrigin) {
    return false;
  }

  const nextUrl = new URL(anchor.href, currentOrigin);
  if (nextUrl.origin !== currentOrigin) {
    return false;
  }

  const currentUrl = new URL(getCurrentInternalPath() || "/", `${currentOrigin}/`);
  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search && nextUrl.hash !== currentUrl.hash) {
    return false;
  }

  if (hasActiveExactRoute(nextUrl.pathname)) {
    return true;
  }

  return hasActiveFallbackRoute();
};

const toInternalPath = (path: string) => path || "/";

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

export const handleAnchorClick = (event: any) => {
  const anchor = findAnchor(event);
  if (!shouldHandleAnchorClick(event, anchor)) {
    return;
  }

  if (!anchor) {
    return;
  }

  event.preventDefault?.();
  const nextUrl = new URL(anchor.href, `${getCurrentOrigin()}/`);
  pushRoute(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
};
