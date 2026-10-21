// 轻量静态路由: 路径只有静态字符串, 参数只走 query string, 滚动只记窗口位置.
// 本模块顶层零副作用: 浏览器对象一律经 ensureRouteState() 惰性获取.

/** 浏览器位置快照 (只读, 由 ensureRouteState 维护). */
export type RouteLocation = {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly origin: string;
  readonly href: string;
};

/**
 * 路由依赖的最小浏览器表面. 生产环境由 globalThis 提供, 测试注入假实现,
 * 这样滚动与导航状态机可以在无 DOM 的环境里被行为测试覆盖.
 */
export type RoutePort = {
  readonly location: RouteLocation;
  readonly history: {
    state: unknown;
    scrollRestoration: "auto" | "manual";
    pushState: (state: unknown, unused: string, url: string) => void;
    replaceState: (state: unknown, unused: string, url: string) => void;
  };
  readonly scrollY: number;
  scrollTo: (x: number, y: number) => void;
  addEventListener: (type: string, listener: (event?: unknown) => void) => void;
  removeEventListener: (type: string, listener: (event?: unknown) => void) => void;
  readonly document: {
    addEventListener: (type: string, listener: (event: unknown) => void) => void;
    removeEventListener: (type: string, listener: (event: unknown) => void) => void;
  };
  readonly sessionStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  readonly performance?: { getEntriesByType?: (type: string) => ReadonlyArray<{ type?: string }> };
  requestAnimationFrame?: (callback: () => void) => void;
};

/** 兜底路由的 path 取值. */
const FALLBACK_ROUTE_PATH = "/*";

/**
 * 归一化 pathname: percent-decode (非法编码保留原值) -> 补前导斜杠 ->
 * 折叠重复斜杠 -> 去尾斜杠 (根除外).
 */
export const normalizePathname = (pathname: string): string => {
  if (!pathname) return "/";
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  const withLeading = decoded.startsWith("/") ? decoded : `/${decoded}`;
  const collapsed = withLeading.replace(/\/{2,}/g, "/");
  if (collapsed.length === 1) return collapsed;
  const trimmed = collapsed.replace(/\/+$/, "");
  return trimmed || "/";
};

/** 只有 `/*` 是兜底路径. */
export const isFallbackRoutePath = (path: string): boolean => path === FALLBACK_ROUTE_PATH;

/** 精确匹配: 归一化后逐字比较, 大小写敏感, 兜底路径永不参与精确匹配. */
export const matchesExactRoute = (path: string, pathname: string): boolean =>
  !isFallbackRoutePath(path) && normalizePathname(path) === normalizePathname(pathname);
