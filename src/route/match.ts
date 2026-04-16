export const FALLBACK_ROUTE_PATH = "/*";

export const isFallbackRoutePath = (path: string) => path === FALLBACK_ROUTE_PATH;

export const matchesExactRoute = (path: string, pathname: string) => !isFallbackRoutePath(path) && path === pathname;
