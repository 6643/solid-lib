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

/** 一个已挂载的路由块. `isEnabled` 由使用方提供, 读取它就是订阅它的开关. */
export type RegisteredRoute = {
  path: string;
  fallback: boolean;
  isEnabled: () => boolean;
};

const registry = new Map<symbol, RegisteredRoute>();

/** 注册一个路由块, 返回用于注销的 id. 非兜底路径在入口归一化. */
export const registerRoute = (route: RegisteredRoute): symbol => {
  const id = Symbol(route.path);
  registry.set(id, {
    path: route.fallback ? route.path : normalizePathname(route.path),
    fallback: route.fallback,
    isEnabled: route.isEnabled,
  });
  return id;
};

export const unregisterRoute = (id: symbol): void => {
  registry.delete(id);
};

/**
 * 是否存在"已启用且精确匹配"的块. 每次调用都全表扫描, 不缓存:
 * 条目数是个位数, 而缓存需要跟随 isEnabled 增减, 只会引入失效 bug.
 */
export const hasActiveExactRoute = (pathname: string): boolean => {
  for (const route of registry.values()) {
    if (route.fallback || !route.isEnabled()) continue;
    if (matchesExactRoute(route.path, pathname)) return true;
  }
  return false;
};

/** 兜底块判据: 当前 pathname 没有任何已启用的精确匹配. */
export const hasActiveFallbackRoute = (): boolean =>
  !hasActiveExactRoute(normalizePathname(readLocation().pathname));

/** 仅供测试: 清空注册表. */
export const resetRouteForTests = (): void => {
  registry.clear();
};

/** 本库写进 history.state 的元数据. 与用户 state 合并, 不整体覆盖. */
export type RouteHistoryState = {
  depth: number;
  backPath?: string;
};

export const ROUTE_STATE_KEY = "__solid_route__";

const warnRoute = (message: string): void => {
  console.warn(`[solid-lib/route] ${message}`);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
};

const readRouteHistoryState = (state: unknown): RouteHistoryState => {
  const meta = isPlainObject(state) ? state[ROUTE_STATE_KEY] : undefined;
  if (!isPlainObject(meta)) return { depth: 0 };
  const depth =
    typeof meta.depth === "number" && Number.isFinite(meta.depth) ? meta.depth : 0;
  const backPath = typeof meta.backPath === "string" ? meta.backPath : undefined;
  return backPath === undefined ? { depth } : { depth, backPath };
};

const mergeHistoryState = (base: unknown, meta: RouteHistoryState): Record<string, unknown> =>
  isPlainObject(base) ? { ...base, [ROUTE_STATE_KEY]: meta } : { [ROUTE_STATE_KEY]: meta };

const refreshLocation = (): void => {
  if (port) setLocation(snapshotOf(port));
};

/**
 * 校验并解析站内路径, 返回 pathname + search + hash.
 * 跨源, 协议相对 (`//host`), 非 http(s) 协议一律抛错.
 */
export const resolveInternalPath = (raw: string, origin: string): string => {
  if (raw.startsWith("//")) throw new Error(`不允许协议相对路径: ${raw}`);
  const url = new URL(raw, origin);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`不允许的协议: ${url.protocol}`);
  }
  if (url.origin !== origin) throw new Error(`不允许跨源导航: ${raw}`);
  return `${url.pathname}${url.search}${url.hash}`;
};

/** 压入一条历史记录: depth 递增, backPath 指回离开时的 pathname + search. */
export const pushRoute = (path: string): void => {
  const current = port;
  if (!current) {
    warnRoute(`无浏览器环境, 忽略导航: ${path}`);
    return;
  }
  const next = resolveInternalPath(path, current.location.origin);
  const previous = readRouteHistoryState(current.history.state);
  const state = mergeHistoryState(current.history.state, {
    depth: previous.depth + 1,
    backPath: `${current.location.pathname}${current.location.search}`,
  });
  current.history.pushState(state, "", next);
  refreshLocation();
};

/** 替换当前历史记录: 继承 depth 与既有 backPath. */
export const replaceRoute = (path: string): void => {
  const current = port;
  if (!current) {
    warnRoute(`无浏览器环境, 忽略导航: ${path}`);
    return;
  }
  const next = resolveInternalPath(path, current.location.origin);
  const previous = readRouteHistoryState(current.history.state);
  const meta: RouteHistoryState =
    previous.backPath === undefined
      ? { depth: previous.depth }
      : { depth: previous.depth, backPath: previous.backPath };
  current.history.replaceState(mergeHistoryState(current.history.state, meta), "", next);
  refreshLocation();
};

/** 当前记录的返回路径; 缺失或非法 (旧数据) 时返回 null. */
export const getRouteBackPath = (): string | null => {
  const current = port;
  if (!current) return null;
  const { backPath } = readRouteHistoryState(current.history.state);
  if (backPath === undefined) return null;
  try {
    return resolveInternalPath(backPath, current.location.origin);
  } catch {
    return null;
  }
};
