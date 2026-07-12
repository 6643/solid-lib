export const FALLBACK_ROUTE_PATH = "/*";

export const isFallbackRoutePath = (path: string) => path === FALLBACK_ROUTE_PATH;

/** Normalize pathname for exact matching: decode, collapse slashes, strip trailing slash. */
export const normalizePathname = (pathname: string): string => {
    if (!pathname) {
        return "/";
    }

    let decoded = pathname;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        // Keep the raw pathname when it is not valid percent-encoding.
    }

    if (!decoded.startsWith("/")) {
        decoded = `/${decoded}`;
    }

    decoded = decoded.replace(/\/+/g, "/");

    if (decoded.length > 1 && decoded.endsWith("/")) {
        decoded = decoded.slice(0, -1);
    }

    return decoded || "/";
};

export const matchesExactRoute = (path: string, pathname: string) =>
    !isFallbackRoutePath(path) && normalizePathname(path) === normalizePathname(pathname);
