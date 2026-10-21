// 轻量静态路由: 路径只有静态字符串, 参数只走 query string, 滚动只记窗口位置.
import { createSignal, type Accessor } from "solid-js";

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

const noop = (): void => {};

const EMPTY_LOCATION: RouteLocation = {
  pathname: "/",
  search: "",
  hash: "",
  origin: "",
  href: "",
};

// 单例状态: 当前端口, 解绑句柄, location 快照 (信号只在一处写入, 读取方自然订阅).
let port: RoutePort | null = null;
let detachRoute: (() => void) | null = null;
// 后续任务 (滚动监听 / 链接拦截) 把自己的摘除逻辑 push 进来, 统一由 detachRouteState 执行.
let unbindTasks: Array<() => void> = [];
const [location, setLocation] = createSignal<RouteLocation>(EMPTY_LOCATION);

/** 当前 location 快照; 读取它就是订阅导航. */
export const readLocation = (): RouteLocation => location();

const snapshotOf = (source: RoutePort): RouteLocation => ({
  pathname: source.location.pathname,
  search: source.location.search,
  hash: source.location.hash,
  origin: source.location.origin,
  href: source.location.href,
});

/** 惰性取 globalThis.window; 无浏览器或形状不符时返回 null (不抛错). */
const resolveGlobalPort = (): RoutePort | null => {
  const candidate = (globalThis as { window?: Partial<RoutePort> }).window;
  if (!candidate?.location || !candidate.history || !candidate.document) return null;
  return candidate as RoutePort;
};

const detachRouteState = (): void => {
  for (const unbind of unbindTasks) unbind();
  unbindTasks = [];
  port = null;
  detachRoute = null;
  setLocation(EMPTY_LOCATION);
};

/**
 * 绑定浏览器端口并挂上路由状态机. 幂等: 同一端口重复调用返回同一个解绑函数.
 * 传 null 表式解绑并回到无浏览器状态; 无参数时自动取 globalThis.window.
 */
export const ensureRouteState = (next?: RoutePort | null): (() => void) => {
  if (next === null) {
    detachRouteState();
    return noop;
  }
  const source = next ?? resolveGlobalPort();
  if (!source) return noop;
  if (port === source && detachRoute) return detachRoute;
  detachRouteState();
  port = source;
  setLocation(snapshotOf(source));
  detachRoute = detachRouteState;
  return detachRoute;
};

const TRUE_VALUES = ["1", "on", "true", "yes"];
const FALSE_VALUES = ["0", "false", "no", "off"];

const readParamValue = (name: string): string | null =>
  new URLSearchParams(readLocation().search).get(name);

const parseBooleanParam = (raw: string | null, fallback: boolean): boolean => {
  if (raw === null) return fallback;
  const value = raw.toLowerCase();
  if (TRUE_VALUES.includes(value)) return true;
  if (FALSE_VALUES.includes(value)) return false;
  return fallback;
};

const parseNumberParam = (raw: string | null, fallback: number): number => {
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

export type ParamParser<T> = (raw: string | null) => T;
export type ParamFallback = boolean | number | string;

/**
 * 读一个 query 参数, 返回 accessor: 每次调用都按当前 search 重新解析.
 * 布尔真值 1/on/true/yes, 假值 0/false/no/off, 其它取 fallback;
 * 数字非有限值取 fallback; 缺键时自定义 parser 收到 null.
 */
export function parseParam(name: string, fallback: string): Accessor<string>;
export function parseParam(name: string, fallback: number): Accessor<number>;
export function parseParam(name: string, fallback: boolean): Accessor<boolean>;
export function parseParam<T>(name: string, parser: ParamParser<T>): Accessor<T>;
export function parseParam(
  name: string,
  parserOrFallback: ParamFallback | ParamParser<unknown>,
): Accessor<unknown> {
  ensureRouteState();
  const read = (): unknown => {
    const raw = readParamValue(name);
    if (typeof parserOrFallback === "function") return parserOrFallback(raw);
    if (typeof parserOrFallback === "boolean") return parseBooleanParam(raw, parserOrFallback);
    if (typeof parserOrFallback === "number") return parseNumberParam(raw, parserOrFallback);
    return raw ?? parserOrFallback;
  };
  return read;
}

export type ParamSchema = Record<string, ParamParser<unknown>>;
export type ParsedParams<T extends ParamSchema> = { readonly [K in keyof T]: ReturnType<T[K]> };

/** 按 schema 批量解析, 每个键一个 accessor. */
export const parseParams = <T extends ParamSchema>(
  schema: T,
): { readonly [K in keyof T]: Accessor<ParsedParams<T>[K]> } => {
  ensureRouteState();
  const accessors = Object.entries(schema).map(
    ([key, parser]) => [key, () => parser(readParamValue(key))] as const,
  );
  return Object.fromEntries(accessors) as { readonly [K in keyof T]: Accessor<ParsedParams<T>[K]> };
};
