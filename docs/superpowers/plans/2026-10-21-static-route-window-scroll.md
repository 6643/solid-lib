# Static Route + Window Scroll Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用单文件 `src/Route.ts` 交付静态路径路由 (多块同渲染 + query 参数 + 窗口级滚动恢复), 并把 demo 切到这套路由、移除 `@solidjs/router`。

**Architecture:** 一个文件内按数据流分层: 纯函数 (归一化/匹配/参数解析) → 模块单例 (location 快照, 注册表 Map, depth, positions Map) → 副作用边界 `ensureRouteState(port?)` (幂等挂/摘监听, 无浏览器早返) → 无 JSX 的 `<Route>` 组件 (在组件体内同步注册, 用 `onCleanup` 注销, 在自己的 JSX 位置独立判断是否 `createComponent`)。全部行为经注入的假 `RoutePort` 驱动, 不依赖 DOM。

**Tech Stack:** TypeScript 7.0.2, Solid 2.0.0-rc.16 (`createComponent`/`untrack`/`getOwner`/`onCleanup`), `node --test` + `test/harness/*`, Vite+ / `@solidjs/vite-plugin` (demo 构建)。

**Spec:** `docs/superpowers/specs/2026-10-21-static-route-window-scroll-design.md`

## Global Constraints

- 运行时 peer: `solid-js@2.0.0-rc.16`, `@solidjs/web@2.0.0-rc.16`; 不新增任何运行时依赖。
- 实现文件只有 `src/Route.ts`; 不得创建 `src/route/` 目录 (`test/flat-source-entry.test.ts:21` 断言该路径不存在)。
- 模块顶层零副作用: 顶层不得访问 `window` / `document` / `history` / `sessionStorage`; 一律经 `ensureRouteState(port?)` 与 `globalThis` 惰性获取。
- 组件零 JSX (用 `createComponent`), 文件后缀必须是 `.ts` (Node 无法加载 `.tsx`)。
- **测试不得依赖 Solid 调度器**: `node --test` 下 `solid-js` 解析到 `dist/server.js`, 实测该构建里 memo 不会因写入失效、`createEffect` 的 apply 不执行、`onSettled` 不触发。因此断言一律"调用读取函数后立即比较", 禁止用 `flush()` 等待响应式更新; 逻辑必须做到每次读取都重新求值 (无缓存)。
- 注册与注销不得使用 `onSettled`: 在组件体内同步注册 (写普通 `Map`, 不是响应式写), 用 `onCleanup` 注销。
- 非浏览器环境不得抛错: 导航类 API 告警后 no-op。
- 测试命令: `node --import ./test/harness/resolve.ts --test ./test/*.test.ts`; 断言库 `test/harness/test.ts`。
- 中文注释与文案, ASCII 标点。

## Review Focus

- `path` 写成 `/abc/`、`/a//b`、大写或含 `:`: 尾斜杠与重复斜杠归一, 大小写**敏感**, 含 `:` 打一次警告且永不匹配。
- 连续快速 push/pop 时 depth 与 positions 错位: push 必须剪掉 `depth >= 新 depth` 的记录。
- 3 个匹配块中条件块翻转使精确匹配归零: 兜底必须出现, 翻回必须消失, 不得振荡。
- 恢复发生在用户已开始滚动之后: 用户滚动取消待恢复, 不得把视图拽回。
- `sessionStorage` 内容为损坏 JSON 或旧结构: 吞错回到空表, 不得抛错。

---

### Task 1: 端口类型 + 路径归一化与精确匹配

**Files:**
- Create: `src/Route.ts`
- Test: `test/route.test.ts`

**Interfaces:**
- Produces:
  - `export type RouteLocation = { pathname: string; search: string; hash: string; origin: string; href: string }`
  - `export type RoutePort` (原文见下, 后续任务与测试共用)
  - `export const normalizePathname: (pathname: string) => string`
  - `export const isFallbackRoutePath: (path: string) => boolean` (仅 `"/*"`)
  - `export const matchesExactRoute: (path: string, pathname: string) => boolean`

```ts
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
```

- [ ] **Step 1: Write the failing test**

`test/route.test.ts`:

```ts
import { expect, test } from "./harness/test.ts";
import { isFallbackRoutePath, matchesExactRoute, normalizePathname } from "../src/Route.ts";

test("normalizePathname decodes, collapses slashes, and strips the trailing slash", () => {
  expect(normalizePathname("")).toBe("/");
  expect(normalizePathname("/")).toBe("/");
  expect(normalizePathname("/abc/")).toBe("/abc");
  expect(normalizePathname("abc")).toBe("/abc");
  expect(normalizePathname("/a//b///")).toBe("/a/b");
  expect(normalizePathname("/a%20b")).toBe("/a b");
  expect(normalizePathname("/bad%E0%A4%A")).toBe("/bad%E0%A4%A");
});

test("matchesExactRoute is literal, case sensitive, and never matches the fallback path", () => {
  expect(matchesExactRoute("/abc", "/abc/")).toBe(true);
  expect(matchesExactRoute("/a//b", "/a/b")).toBe(true);
  expect(matchesExactRoute("/Abc", "/abc")).toBe(false);
  expect(matchesExactRoute("/*", "/*")).toBe(false);
  expect(isFallbackRoutePath("/*")).toBe(true);
  expect(isFallbackRoutePath("*")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: FAIL — `Cannot find module '../src/Route.ts'`

- [ ] **Step 3: Implement the port type and three pure functions**

归一化顺序: 空值 → `/`; 尝试 `decodeURIComponent`, 失败保留原值; 补前导 `/`; 折叠 `/\/+/g`; 长度大于 1 时去尾斜杠。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/Route.ts test/route.test.ts
git commit -m "feat(route): add port type, path normalization and exact match"
```

---

### Task 2: 端口装配 + query 参数

**Files:**
- Modify: `src/Route.ts`
- Test: `test/route.test.ts`, `test/route-fakes.ts` (create)

**Interfaces:**
- Consumes: `RoutePort`, `normalizePathname` (Task 1)
- Produces:
  - `export const ensureRouteState: (port?: RoutePort | null) => () => void` — 本任务只做"绑定端口 + 维护 location 快照 + 解绑"; 监听器在 Task 5/6 追加; `null` 表示解绑并回到无浏览器状态; 同一端口重复调用返回同一个 cleanup
  - `export const readLocation: () => RouteLocation`
  - `export type ParamParser<T> = (raw: string | null) => T`
  - `export type ParamFallback = boolean | number | string`
  - `export type ParamSchema = Record<string, ParamParser<unknown>>`
  - `export type ParsedParams<T extends ParamSchema> = { readonly [K in keyof T]: ReturnType<T[K]> }`
  - `export function parseParam(name: string, fallback: string): Accessor<string>` (`number` / `boolean` / `ParamParser<T>` 重载)
  - `export function parseParams<T extends ParamSchema>(schema: T): { readonly [K in keyof T]: Accessor<ParsedParams<T>[K]> }`

- [ ] **Step 1: Write the failing test**

`test/route-fakes.ts`:

```ts
import type { RoutePort } from "../src/Route.ts";

type Listener = (event?: unknown) => void;

export const createFakePort = (path = "/", state: unknown = null) => {
  const listeners = new Map<string, Listener[]>();
  const calls = { scrollTo: [] as Array<[number, number]>, storage: {} as Record<string, string> };
  const url = () => new URL(path, "https://example.test");
  const port = {
    location: {
      get pathname() { return url().pathname; },
      get search() { return url().search; },
      get hash() { return url().hash; },
      origin: "https://example.test",
      get href() { return url().href; },
    },
    history: {
      state,
      scrollRestoration: "auto" as "auto" | "manual",
      pushState: (_state: unknown, _unused: string, next: string) => { path = next; },
      replaceState: (_state: unknown, _unused: string, next: string) => { path = next; },
    },
    scrollY: 0,
    scrollTo: (x: number, y: number) => { calls.scrollTo.push([x, y]); },
    addEventListener: (type: string, listener: Listener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener: (type: string, listener: Listener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== listener));
    },
    document: {
      addEventListener: (type: string, listener: Listener) => {
        listeners.set(`document:${type}`, [...(listeners.get(`document:${type}`) ?? []), listener]);
      },
      removeEventListener: (type: string, listener: Listener) => {
        listeners.set(`document:${type}`, (listeners.get(`document:${type}`) ?? []).filter((item) => item !== listener));
      },
    },
    sessionStorage: {
      getItem: (key: string) => calls.storage[key] ?? null,
      setItem: (key: string, value: string) => { calls.storage[key] = value; },
    },
    emit: (type: string, event?: unknown) => {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    listenerCount: (type: string) => (listeners.get(type) ?? []).length,
    calls,
  };
  return port as typeof port & RoutePort;
};
```

`test/route.test.ts` 顶部追加:

```ts
import { ensureRouteState, parseParam, parseParams, readLocation } from "../src/Route.ts";
import { createFakePort } from "./route-fakes.ts";
```

追加用例:

```ts
test("parseParam maps fallbacks and custom parsers", () => {
  const detach = ensureRouteState(createFakePort("/x?page=3&enabled=yes&flag=1&name=&bad=Infinity"));
  expect(parseParam("page", 1)()).toBe(3);
  expect(parseParam("missing", 7)()).toBe(7);
  expect(parseParam("bad", 7)()).toBe(7);
  expect(parseParam("name", "d")()).toBe("");
  expect(parseParam("enabled", false)()).toBe(true);
  expect(parseParam("flag", false)()).toBe(true);
  expect(parseParam("off", true)()).toBe(true);
  expect(parseParam("off", (raw) => (raw === null ? "none" : raw))()).toBe("none");
  expect(parseParam("page", String)()).toBe("3");
  detach();
});

test("parseParam keeps the first value of a repeated key", () => {
  const detach = ensureRouteState(createFakePort("/x?tag=a&tag=b"));
  expect(parseParam("tag", "")()).toBe("a");
  detach();
});

test("parseParams returns one accessor per schema key", () => {
  const detach = ensureRouteState(createFakePort("/x?page=2&enabled=0"));
  const params = parseParams({ page: (raw) => Number(raw ?? 1), enabled: (raw) => raw === "true" });
  expect(params.page()).toBe(2);
  expect(params.enabled()).toBe(false);
  detach();
});

test("ensureRouteState is idempotent and detaching clears the snapshot", () => {
  const port = createFakePort("/x?a=1");
  const detach = ensureRouteState(port);
  expect(ensureRouteState(port)).toBe(detach);
  expect(readLocation().search).toBe("?a=1");
  detach();
  expect(readLocation().search).toBe("");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: FAIL — `ensureRouteState` 未定义

- [ ] **Step 3: Implement the port binding and param layer**

`ensureRouteState(port)` 持有当前端口并暴露 location 快照 (`pathname`/`search`/`hash`/`origin`/`href`); 返回的解绑函数清空端口并把快照归零 (`pathname: "/"`, 其它空串)。参数语义 (与旧实现一致): 布尔真值 `["1","on","true","yes"]`、假值 `["0","false","no","off"]`, 其它返回 fallback; 数字在 `raw === null || raw.trim() === ""` 时返回 fallback, 否则 `Number(raw)` 且 `Number.isFinite` 为假时返回 fallback; 字符串 `raw ?? fallback`; 自定义 parser 收到 `raw` (缺失为 `null`)。两个 parse 函数入口先 `ensureRouteState()`, 且每次调用 accessor 都重新解析当前 search (不缓存结果)。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/Route.ts test/route.test.ts test/route-fakes.ts
git commit -m "feat(route): add port binding and query param accessors"
```

---

### Task 3: 注册表 + 兜底判据

**Files:**
- Modify: `src/Route.ts`
- Test: `test/route.test.ts`

**Interfaces:**
- Consumes: `matchesExactRoute`, `isFallbackRoutePath`, `normalizePathname`, `readLocation`
- Produces:
  - `export type RegisteredRoute = { path: string; fallback: boolean; isEnabled: () => boolean }`
  - `export const registerRoute: (route: RegisteredRoute) => symbol`
  - `export const unregisterRoute: (id: symbol) => void`
  - `export const hasActiveExactRoute: (pathname: string) => boolean`
  - `export const hasActiveFallbackRoute: () => boolean`
  - `export const resetRouteForTests: () => void`

- [ ] **Step 1: Write the failing test**

```ts
test("three routes on one path all match and the fallback follows the enabled ones", () => {
  const detach = ensureRouteState(createFakePort("/abc"));
  let thirdEnabled = false;

  const first = registerRoute({ path: "/abc", fallback: false, isEnabled: () => true });
  const second = registerRoute({ path: "/abc/", fallback: false, isEnabled: () => true });
  const third = registerRoute({ path: "/abc", fallback: false, isEnabled: () => thirdEnabled });
  const fallback = registerRoute({ path: "/*", fallback: true, isEnabled: () => true });

  expect(hasActiveExactRoute("/abc")).toBe(true);
  expect(hasActiveFallbackRoute()).toBe(false);

  unregisterRoute(first);
  unregisterRoute(second);
  expect(hasActiveExactRoute("/abc")).toBe(false);
  expect(hasActiveFallbackRoute()).toBe(true);

  thirdEnabled = true;
  expect(hasActiveExactRoute("/abc")).toBe(true);
  expect(hasActiveFallbackRoute()).toBe(false);

  thirdEnabled = false;
  expect(hasActiveFallbackRoute()).toBe(true);

  unregisterRoute(third);
  unregisterRoute(fallback);
  detach();
  resetRouteForTests();
  expect(hasActiveExactRoute("/abc")).toBe(false);
  expect(hasActiveFallbackRoute()).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: FAIL — `registerRoute` 未定义

- [ ] **Step 3: Implement the registry**

`Map<symbol, RegisteredRoute>`。注册时对非兜底路径做 `normalizePathname`。`hasActiveExactRoute(pathname)` 每次调用都遍历全表, 跳过 `fallback` 与 `isEnabled()` 为假的条目, 命中即 true; 不做任何缓存 (`isEnabled()` 的读取正是实现层给 Solid 的订阅点)。`hasActiveFallbackRoute()` = `!hasActiveExactRoute(normalizePathname(readLocation().pathname))`。`resetRouteForTests()` 清空全表。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/Route.ts test/route.test.ts
git commit -m "feat(route): add route registry and fallback predicate"
```

---

### Task 4: 导航 + history 元数据

**Files:**
- Modify: `src/Route.ts`
- Test: `test/route.test.ts`

**Interfaces:**
- Consumes: `ensureRouteState`, `readLocation`
- Produces:
  - `export type RouteHistoryState = { depth: number; backPath?: string }`
  - `export const ROUTE_STATE_KEY = "__solid_route__"`
  - `export const resolveInternalPath: (raw: string, origin: string) => string` (违规抛错)
  - `export const pushRoute: (path: string) => void`
  - `export const replaceRoute: (path: string) => void`
  - `export const getRouteBackPath: () => string | null`

- [ ] **Step 1: Write the failing test**

```ts
test("pushRoute and replaceRoute write depth plus backPath into history state", () => {
  const port = createFakePort("/start");
  const pushed: Array<{ state: any; url: string }> = [];
  port.history.pushState = (state, _unused, url) => { port.history.state = state; pushed.push({ state, url }); };
  port.history.replaceState = (state) => { port.history.state = state; };
  const detach = ensureRouteState(port);

  pushRoute("/next?page=2");
  expect(pushed.at(-1)?.url).toBe("/next?page=2");
  expect((port.history.state as any)[ROUTE_STATE_KEY]).toMatchObject({ depth: 1, backPath: "/start" });
  expect(getRouteBackPath()).toBe("/start");

  replaceRoute("/other");
  expect((port.history.state as any)[ROUTE_STATE_KEY]).toMatchObject({ depth: 1, backPath: "/start" });
  expect(getRouteBackPath()).toBe("/start");

  detach();
  expect(getRouteBackPath()).toBeNull();
});

test("navigation rejects cross-origin, protocol-relative and non-http(s) paths", () => {
  const port = createFakePort("/start");
  let writes = 0;
  port.history.pushState = () => { writes += 1; };
  const detach = ensureRouteState(port);

  for (const bad of ["https://evil.test/x", "//evil.test/x", "javascript:alert(1)", "data:text/html,x"]) {
    expect(() => pushRoute(bad)).toThrow();
  }
  expect(writes).toBe(0);
  expect(resolveInternalPath("/ok?x=1#h", "https://example.test")).toBe("/ok?x=1#h");

  detach();
});

test("navigation without a browser warns and does nothing", () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warnings.push(message); };

  expect(() => pushRoute("/silent")).not.toThrow();
  expect(warnings.some((line) => line.includes("/silent"))).toBe(true);

  console.warn = original;
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: FAIL — `pushRoute` 未定义

- [ ] **Step 3: Implement navigation**

`resolveInternalPath(raw, origin)`: `new URL(raw, origin)`; 协议必须 `http:`/`https:`; origin 必须等于传入 origin; `raw` 以 `//` 开头即违规; 返回 `pathname + search + hash`。`pushRoute`: depth = 当前 depth + 1, backPath = 写入前的 `pathname + search`。`replaceRoute`: 继承当前 depth 与已有 backPath。写入时合并当前 entry 的 plain object state; 若当前 state 非 plain object 则整体替换为 `{ [ROUTE_STATE_KEY]: 元数据 }`。无端口时经 `warnRoute` 告警后 no-op。`getRouteBackPath` 只返回通过 `resolveInternalPath` 校验的 `backPath`, 否则 `null`。`warnRoute(message)` 内部调用 `console.warn`。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/Route.ts test/route.test.ts
git commit -m "feat(route): add navigation with validated history metadata"
```

---

### Task 5: 窗口滚动恢复

**Files:**
- Modify: `src/Route.ts`
- Test: `test/route.test.ts`

**Interfaces:**
- Consumes: `RouteHistoryState`, `ROUTE_STATE_KEY`, `ensureRouteState`
- Produces:
  - `export const SCROLL_STORAGE_KEY = "solid-route:scroll"`
  - `export const readScrollDepth: () => number`
  - `export const recordScroll: (y: number) => void`
  - `export const pruneScroll: (fromDepth: number) => void`
  - `export const markTraversal: (depth: number) => void`
  - `export const restoreScroll: () => void` (浏览器里由 `popstate` / 初始化经 rAF 或 microtask 调度; 测试直接调用)

- [ ] **Step 1: Write the failing test**

```ts
test("pop restores the recorded window position exactly once", () => {
  const port = createFakePort("/list", { [ROUTE_STATE_KEY]: { depth: 2 } });
  const detach = ensureRouteState(port);

  port.scrollY = 640;
  port.emit("scroll");
  port.emit("popstate", { state: { [ROUTE_STATE_KEY]: { depth: 2 } } });
  restoreScroll();
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([[0, 640]]);

  detach();
  expect(port.listenerCount("scroll")).toBe(0);
  expect(port.listenerCount("popstate")).toBe(0);
});

test("user scrolling cancels a pending restore", () => {
  const port = createFakePort("/list", { [ROUTE_STATE_KEY]: { depth: 1 } });
  const detach = ensureRouteState(port);
  recordScroll(500);

  port.emit("popstate", { state: { [ROUTE_STATE_KEY]: { depth: 1 } } });
  port.scrollY = 12;
  port.emit("scroll");
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([]);

  detach();
});

test("pruneScroll drops forward positions, and pagehide persists the map", () => {
  const port = createFakePort("/a", { [ROUTE_STATE_KEY]: { depth: 3 } });
  const detach = ensureRouteState(port);

  recordScroll(900);
  pruneScroll(3);
  markTraversal(3);
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([]);

  recordScroll(300);
  port.emit("pagehide");
  expect(JSON.parse(port.calls.storage[SCROLL_STORAGE_KEY])).toEqual({ depth: 3, positions: { "3": 300 } });

  detach();
});

test("a corrupt storage payload is ignored", () => {
  const port = createFakePort("/a");
  port.calls.storage[SCROLL_STORAGE_KEY] = "{not json";
  const detach = ensureRouteState(port);
  expect(readScrollDepth()).toBe(0);
  detach();
});

test("only reload and back_forward initial loads arm a restore", () => {
  const port = createFakePort("/a", { [ROUTE_STATE_KEY]: { depth: 0 } });
  (port as any).performance = { getEntriesByType: () => [{ type: "navigate" }] };
  const detach = ensureRouteState(port);
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([]);
  detach();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: FAIL — `recordScroll` 未定义

- [ ] **Step 3: Implement scroll restoration**

`positions: Map<number, number>`; `currentDepth()` 读 `port.history.state?.[ROUTE_STATE_KEY]?.depth ?? 0`。`recordScroll(y)` 写当前 depth (有 `requestAnimationFrame` 时合并到一帧)。`markTraversal(depth)` 设待恢复目标并调度一次 `restoreScroll` (rAF 优先, 否则 `queueMicrotask`)。`restoreScroll()` 仅在有待恢复目标且 `positions` 有值时动作: 置 `programmatic` → `scrollTo(0, y)` → 清标志 → 清待恢复。`programmatic` 为假时的 `scroll` 事件取消待恢复。`pruneScroll(fromDepth)` 删除 `depth >= fromDepth`。`pagehide` 把 `{ depth, positions }` 写入 `sessionStorage[SCROLL_STORAGE_KEY]` (JSON, `try/catch` 吞错)。`ensureRouteState` 绑定时: 设 `history.scrollRestoration = "manual"`、读 storage (损坏则空表)、绑定并成对解绑 `scroll`/`popstate`/`pagehide`/`pageshow`/`load`; 仅当 `performance.getEntriesByType("navigation")[0]?.type` 为 `"reload"` 或 `"back_forward"` 时把当前 depth 标记为待恢复。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: PASS (15 tests)

- [ ] **Step 5: Commit**

```bash
git add src/Route.ts test/route.test.ts
git commit -m "feat(route): add window scroll restoration keyed by history depth"
```

---

### Task 6: `<Route>` 组件 + 链接拦截

**Files:**
- Modify: `src/Route.ts`
- Test: `test/route.test.ts`

**Interfaces:**
- Consumes: Task 1-5 全部内部函数
- Produces:
  - `export type RouteProps = { path: string; component: Component; when?: boolean | (() => boolean) }`
  - `export const Route: (props: RouteProps) => unknown` (在 JSX 中作为元素; 直接调用返回可调用 accessor)

- [ ] **Step 1: Write the failing test**

```ts
test("a Route renders only while its path matches and its when is true", () => {
  const detach = ensureRouteState(createFakePort("/abc"));
  let gated = false;

  const matched = Route({ path: "/abc", component: () => "abc" }) as () => unknown;
  const other = Route({ path: "/def", component: () => "def" }) as () => unknown;
  const conditional = Route({ path: "/abc/", when: () => gated, component: () => "gated" }) as () => unknown;

  expect(matched()).toBe("abc");
  expect(other()).toBeUndefined();
  expect(conditional()).toBeUndefined();
  expect(hasActiveExactRoute("/abc")).toBe(true);

  gated = true;
  expect(conditional()).toBe("gated");

  detach();
  resetRouteForTests();
});

test("two exact routes on one path both render and the fallback stays hidden", () => {
  const detach = ensureRouteState(createFakePort("/abc"));

  const first = Route({ path: "/abc", component: () => "one" }) as () => unknown;
  const second = Route({ path: "/abc", component: () => "two" }) as () => unknown;
  const fallback = Route({ path: "/*", component: () => "fallback" }) as () => unknown;

  expect([first(), second()]).toEqual(["one", "two"]);
  expect(fallback()).toBeUndefined();

  detach();
  resetRouteForTests();
});

test("the fallback appears once the last exact route stops matching", () => {
  const detach = ensureRouteState(createFakePort("/abc"));
  const fallback = Route({ path: "/*", component: () => "fallback" }) as () => unknown;
  const exact = Route({ path: "/abc", component: () => "exact" }) as () => unknown;

  expect(exact()).toBe("exact");
  expect(fallback()).toBeUndefined();

  detach();
  ensureRouteState(createFakePort("/abc/other"));
  expect(fallback()).toBe("fallback");
  resetRouteForTests();
});

test("a path with dynamic segments warns once and never matches", () => {
  const detach = ensureRouteState(createFakePort("/user/42"));
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warnings.push(message); };

  const view = Route({ path: "/user/:id", component: () => "user" }) as () => unknown;
  expect(view()).toBeUndefined();
  expect(view()).toBeUndefined();
  expect(warnings.filter((line) => line.includes("/user/:id")).length).toBe(1);

  console.warn = original;
  detach();
  resetRouteForTests();
});

test("anchor clicks navigate in place and are ignored outside the contract", () => {
  const port = createFakePort("/start");
  const detach = ensureRouteState(port);
  const pushed: string[] = [];
  port.history.pushState = (_state, _unused, url) => { pushed.push(url); };

  const anchor = (href: string, extra: Record<string, unknown> = {}) => ({
    closest: (selector: string) => (selector === "a[href]" ? { getAttribute: () => href, href, ...extra } : null),
  });

  port.emit("document:click", { button: 0, target: anchor("/go") });
  port.emit("document:click", { button: 0, target: anchor("/ext"), metaKey: true });
  port.emit("document:click", { button: 1, target: anchor("/middle") });
  port.emit("document:click", { button: 0, target: anchor("/hash", { hash: "#x" }) });
  port.emit("document:click", { button: 0, target: anchor("https://evil.test/x") });
  expect(pushed).toEqual(["/go"]);

  detach();
  resetRouteForTests();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: FAIL — `Route` 未定义

- [ ] **Step 3: Implement `Route` and click interception**

`Route` 用 `untrack` 读取 `props.path` / `props.component`; 路径含 `:` 或含非法 `*` 时 `warnRoute` (每实例一次) 并注册为永不匹配的条目; **在组件体内同步注册** (写普通 `Map`), 并用 `onCleanup` 注销 (无 owner 时不报错, 由 `resetRouteForTests` 兜底)。返回的 accessor 每次调用都重新求值: `when` 为假或未匹配 → `undefined`; 否则 `createComponent(component, {})` 并按匹配状态缓存结果。

`click` 拦截: 读 `event.defaultPrevented`、`event.button !== 0`、`event.altKey|ctrlKey|metaKey|shiftKey`、`target.closest("a[href]")`; 命中后排除 `href` 以 `#` 开头、`download` 属性、`target="_blank"`; 其余交给 `pushRoute`, 校验失败时捕获并 `warnRoute`, 不阻止默认行为。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/route.test.ts`
Expected: PASS (20 tests)

- [ ] **Step 5: Verify no top-level browser access**

Run: `node --import ./test/harness/resolve.ts -e "import('./src/Route.ts').then((m) => console.log(Object.keys(m).sort().join(',')))"`
Expected: 打印导出表且不抛错

- [ ] **Step 6: Commit**

```bash
git add src/Route.ts test/route.test.ts
git commit -m "feat(route): add Route component and anchor interception"
```

---

### Task 7: 包导出与文档

**Files:**
- Modify: `package.json`, `test/package-metadata.test.ts:15`, `README.md`
- Test: `test/package-metadata.test.ts`

**Interfaces:**
- Produces: `exports["./route"] = { types: "./src/Route.ts", import: "./src/Route.ts" }`

- [ ] **Step 1: Write the failing test**

`test/package-metadata.test.ts` 第一处断言改为:

```ts
expect(Object.keys(packageJson.exports).sort()).toEqual([".", "./route", "./ui.css"]);
expect(packageJson.exports["./route"]).toEqual({
  types: "./src/Route.ts",
  import: "./src/Route.ts",
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/package-metadata.test.ts`
Expected: FAIL — `exports` 键不含 `./route`

- [ ] **Step 3: Add the export and README section**

README 增加用法段: 静态路径 + `/*` 兜底 + 多块同渲染; `parseParam("page", 1)()`; `pushRoute`/`replaceRoute`/`getRouteBackPath`; 滚动恢复只记窗口位置且按 history depth, 容器滚动用 `useKeepScroll`。

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./test/harness/resolve.ts --test ./test/package-metadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json README.md test/package-metadata.test.ts
git commit -m "feat(route): expose solid-lib/route subpath"
```

---

### Task 8: demo 切到本路由并移除 `@solidjs/router`

**Files:**
- Modify: `demo/src/App.tsx`, `demo/vite.config.ts`, `demo/package.json`, `demo/pnpm-lock.yaml`, `test/package-metadata.test.ts:71`
- Create: `demo/src/global.css`
- Test: `test/demo-build.test.ts`, `test/package-metadata.test.ts`

**Interfaces:**
- Consumes: `solid-lib/route` 的 `Route`, `pushRoute`, `replaceRoute`, `getRouteBackPath`, `parseParam`
- Produces: demo 路由表 `/buttons` `/inputs` `/layout` `/interactive` `/display` `/hooks` `/validate` `/theme` `/tabs` + `/*` 兜底

- [ ] **Step 1: Write the failing test**

`test/package-metadata.test.ts:71` 改为:

```ts
expect(demoPackageJson.devDependencies["@solidjs/router"]).toBeUndefined();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./test/harness/resolve.ts --test ./test/package-metadata.test.ts`
Expected: FAIL — demo 仍依赖 `@solidjs/router@2.0.0-next.41`

- [ ] **Step 3: Wire the demo**

- `demo/vite.config.ts`: alias 增加 `"solid-lib/route": fileURLToPath(new URL("../src/Route.ts", import.meta.url))`。
- `demo/src/App.tsx`: 顶部固定导航 (纯 `<a href>`, 走链接拦截) + 文档流内容; 每页一条 `<Route path="/xxx" component={XxxPage} />`; 在 `/buttons` 额外放一条同路径块与一条 `<Show>` 门控块演示多块同渲染; `/*` 兜底为 NotFound 块 (内部不得包含精确路由)。
- `demo/src/global.css` (由 `App.tsx` 顶部 `import "./global.css"`): `html body { height: auto; }` 覆盖库里的 `body { height: 100vh }`, 并给固定导航布局。
- `demo/package.json`: 移除 `@solidjs/router`; 在 `demo/` 下执行 `pnpm install --lockfile-only` 更新 `demo/pnpm-lock.yaml`。

- [ ] **Step 4: Run all tests**

Run: `node --import ./test/harness/resolve.ts --test ./test/*.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Verify the demo manually**

Run: `cd demo && /home/_/.local/share/vite-plus/bin/vp dev`
Expected: `/buttons` 显示 ButtonsPage; 点导航改 URL 且不整页刷新; 长页滚到底 → 切到别的页 → 浏览器后退 → 窗口回到原位置; `/nope` 显示 NotFound。

- [ ] **Step 6: Commit**

```bash
git add demo/src/App.tsx demo/src/global.css demo/vite.config.ts demo/package.json demo/pnpm-lock.yaml test/package-metadata.test.ts
git commit -m "feat(demo): route demo pages through solid-lib/route"
```

---

## Self-Review

- **Spec coverage:** 静态匹配 (T1)、端口装配与 query accessor (T2)、多块注册与兜底判据 (T3, T6)、导航与 back-path (T4)、窗口滚动恢复含剪枝/取消/持久化/失败早返 (T5)、`Route` 组件与链接拦截 (T6)、`./route` 导出与 README (T7)、demo 切换与依赖移除 (T8)。spec 的 Out 项无任务 (符合预期)。
- **Step scan:** 代码步骤只给签名与必须固定的语义; 测试步骤给名字与断言。
- **Type consistency:** `RoutePort` / `RegisteredRoute` / `RouteHistoryState` / `ROUTE_STATE_KEY` / `SCROLL_STORAGE_KEY` 只在引入任务定义; `parseParam` / `parseParams` 一律 accessor; `ensureRouteState` 每个任务只扩展, 签名不变。
- **Review Focus:** 五条各有归属 — 归一化与冒号告警 (T1, T6)、push 剪枝 (T5)、条件块翻转与兜底 (T3, T6)、用户滚动取消恢复 (T5)、损坏 storage (T5)。
- **Scheduler deviation:** spec 原写"注册在 `onSettled`", 实测在 `node --test` 下 `onSettled` 与 memo 失效都不生效 (`solid-js` 解析到 `dist/server.js`), 故改为组件体内同步注册 + `onCleanup` 注销, 并把这条写进 Global Constraints 与 spec。
- **Proportion:** 无函数体转写; 测试代码即契约。
