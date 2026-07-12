export type AnchorLike = {
    download?: string;
    getAttribute?: (name: string) => string | null;
    hash?: string;
    href: string;
    origin?: string;
    pathname?: string;
    search?: string;
    target?: string;
};

export type BrowserClickEvent = {
    altKey?: boolean;
    button?: number;
    composedPath?: () => unknown[];
    ctrlKey?: boolean;
    defaultPrevented?: boolean;
    metaKey?: boolean;
    preventDefault?: () => void;
    shiftKey?: boolean;
    target?: unknown;
};

const isAnchorLike = (value: unknown): value is AnchorLike =>
    !!value && typeof value === "object" && typeof (value as AnchorLike).href === "string";

const findClosestAnchor = (value: unknown): AnchorLike | undefined => {
    const closest = (value as { closest?: (selector: string) => unknown } | undefined)?.closest?.("a[href]");
    return isAnchorLike(closest) ? closest : undefined;
};

export const findAnchor = (event: BrowserClickEvent): AnchorLike | undefined => {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];

    for (const entry of path) {
        if (isAnchorLike(entry)) {
            return entry;
        }

        const closest = findClosestAnchor(entry);
        if (closest) {
            return closest;
        }
    }

    if (isAnchorLike(event.target)) {
        return event.target;
    }

    return findClosestAnchor(event.target);
};

export const parseUrl = (value: string, base: string): URL | undefined => {
    try {
        return new URL(value, base);
    } catch {
        return undefined;
    }
};

const isHttpProtocol = (protocol: string) => protocol === "http:" || protocol === "https:";

/** Same-origin http(s) URL only — rejects javascript:, data:, protocol-relative cross-origin, etc. */
export const isSameOriginHttpUrl = (url: URL, origin: string): boolean =>
    isHttpProtocol(url.protocol) && url.origin === origin;

export const toInternalPath = (url: URL): string => {
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path || "/";
};

/**
 * Resolve a navigation target to a same-origin internal path (pathname + search + hash).
 * Returns undefined when the target escapes the current origin or uses a non-http(s) scheme.
 */
export const resolveInternalRoutePath = (path: string, baseHref: string, origin: string): string | undefined => {
    const input = path || "/";
    const url = parseUrl(input, baseHref);
    if (!url || !isSameOriginHttpUrl(url, origin)) {
        return undefined;
    }

    return toInternalPath(url);
};
