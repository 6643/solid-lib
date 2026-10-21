import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { join } from "node:path";
import { createFakePort } from "./route-fakes.ts";
import {
  ensureRouteState,
  hasActiveExactRoute,
  hasActiveFallbackRoute,
  isFallbackRoutePath,
  matchesExactRoute,
  normalizePathname,
  parseParam,
  parseParams,
  pushRoute,
  replaceRoute,
  resolveInternalPath,
  Route,
  ROUTE_STATE_KEY,
  getRouteBackPath,
  readLocation,
  recordScroll,
  markTraversal,
  pruneScroll,
  readScrollDepth,
  restoreScroll,
  SCROLL_STORAGE_KEY,
  registerRoute,
  resetRouteForTests,
  unregisterRoute,
} from "../src/Route.ts";

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

test("pushRoute and replaceRoute write depth plus backPath into history state", () => {
  const port = createFakePort("/start");
  const pushed: Array<{ state: never; url: string }> = [];
  port.history.pushState = (state, _unused, url) => {
    port.history.state = state;
    pushed.push({ state: state as never, url });
  };
  port.history.replaceState = (state) => {
    port.history.state = state;
  };
  const detach = ensureRouteState(port);

  pushRoute("/next?page=2");
  expect(pushed.at(-1)?.url).toBe("/next?page=2");
  expect((port.history.state as Record<string, never>)[ROUTE_STATE_KEY]).toMatchObject({
    depth: 1,
    backPath: "/start",
  });
  expect(getRouteBackPath()).toBe("/start");

  replaceRoute("/other");
  expect((port.history.state as Record<string, never>)[ROUTE_STATE_KEY]).toMatchObject({
    depth: 1,
    backPath: "/start",
  });
  expect(getRouteBackPath()).toBe("/start");

  detach();
  expect(getRouteBackPath()).toBe(null);
});

test("navigation rejects cross-origin, protocol-relative and non-http(s) paths", () => {
  const port = createFakePort("/start");
  let writes = 0;
  port.history.pushState = () => {
    writes += 1;
  };
  const detach = ensureRouteState(port);

  for (const bad of [
    "https://evil.test/x",
    "//evil.test/x",
    "javascript:alert(1)",
    "data:text/html,x",
  ]) {
    expect(() => pushRoute(bad)).toThrow();
  }
  expect(writes).toBe(0);
  expect(resolveInternalPath("/ok?x=1#h", "https://example.test")).toBe("/ok?x=1#h");

  detach();
});

test("navigation without a browser warns and does nothing", () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => {
    warnings.push(message);
  };

  expect(() => pushRoute("/silent")).not.toThrow();
  expect(warnings.some((line) => line.includes("/silent"))).toBe(true);

  console.warn = original;
});

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

test("user input cancels a pending restore", () => {
  const port = createFakePort("/list", { [ROUTE_STATE_KEY]: { depth: 1 } });
  const detach = ensureRouteState(port);
  recordScroll(500);

  port.emit("popstate", { state: { [ROUTE_STATE_KEY]: { depth: 1 } } });
  port.scrollY = 12;
  port.emit("wheel");
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([]);

  detach();
});

test("a browser-driven scroll during a pending restore neither cancels nor retargets it", () => {
  const port = createFakePort("/list", { [ROUTE_STATE_KEY]: { depth: 1 } });
  const detach = ensureRouteState(port);
  recordScroll(700);

  port.emit("popstate", { state: { [ROUTE_STATE_KEY]: { depth: 1 } } });
  // 浏览器自己把同一个 entry 滚到别处 (原生 history 恢复), 然后我们才拿到帧
  port.scrollY = 1012;
  port.emit("scroll");
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([[0, 700]]);

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
  expect(JSON.parse(port.calls.storage[SCROLL_STORAGE_KEY] ?? "{}")).toEqual({
    depth: 3,
    positions: { "3": 300 },
  });

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
  (port as unknown as { performance: unknown }).performance = {
    getEntriesByType: () => [{ type: "navigate" }],
  };
  const detach = ensureRouteState(port);

  restoreScroll();
  expect(port.calls.scrollTo).toEqual([]);

  detach();
});

test("pushRoute prunes forward positions and returns to the top", () => {
  const port = createFakePort("/a", { [ROUTE_STATE_KEY]: { depth: 1 } });
  const detach = ensureRouteState(port);

  recordScroll(120);
  port.history.state = { [ROUTE_STATE_KEY]: { depth: 2 } };
  recordScroll(500);
  port.history.state = { [ROUTE_STATE_KEY]: { depth: 1 } };

  pushRoute("/c");
  expect(port.calls.scrollTo).toEqual([[0, 0]]);

  port.emit("pagehide");
  expect(JSON.parse(port.calls.storage[SCROLL_STORAGE_KEY] ?? "{}").positions).toEqual({
    "1": 120,
    "2": 0,
  });

  detach();
});

test("a Route renders only while its path matches and its when is true", () => {
  const detach = ensureRouteState(createFakePort("/abc"));
  let gated = false;

  const matched = Route({ path: "/abc", component: () => "abc" }) as () => unknown;
  const other = Route({ path: "/def", component: () => "def" }) as () => unknown;
  const conditional = Route({
    path: "/abc/",
    when: () => gated,
    component: () => "gated",
  }) as () => unknown;

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
  console.warn = (message: string) => {
    warnings.push(message);
  };

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
  port.history.pushState = (_state, _unused, url) => {
    pushed.push(url);
  };

  const anchor = (href: string, extra: Record<string, unknown> = {}) => ({
    closest: (selector: string) =>
      selector === "a[href]" ? { getAttribute: () => href, href, ...extra } : null,
  });

  port.emit("document:click", { button: 0, target: anchor("/go") });
  port.emit("document:click", { button: 0, target: anchor("/ext"), metaKey: true });
  port.emit("document:click", { button: 1, target: anchor("/middle") });
  port.emit("document:click", { button: 0, target: anchor("#inpage") });
  port.emit("document:click", { button: 0, target: anchor("https://evil.test/x") });
  expect(pushed).toEqual(["/go"]);

  detach();
  resetRouteForTests();
});

test("mounting a Route attaches the window state machine", () => {
  const port = createFakePort("/abc");
  (globalThis as { window?: unknown }).window = port;

  const view = Route({ path: "/abc", component: () => "abc" }) as () => unknown;
  expect(view()).toBe("abc");
  expect(port.listenerCount("popstate")).toBe(1);
  expect(port.listenerCount("scroll")).toBe(1);
  expect(port.listenerCount("document:click")).toBe(1);
  expect(port.history.scrollRestoration).toBe("manual");

  ensureRouteState(null);
  delete (globalThis as { window?: unknown }).window;
  resetRouteForTests();
});

test("the route location signal declares its intentional owned writes", async () => {
  // 绑定发生在 <Route> 的组件体内: 全局路由状态写在 owned scope 里是刻意的初始化,
  // 必须显式声明, 否则 Solid 2 dev 会抛 REACTIVE_WRITE_IN_OWNED_SCOPE 并停掉响应式系统.
  const source = await readText(join(import.meta.dirname, "..", "src", "Route.ts"));
  expect(source).toContain("createSignal<RouteLocation>(EMPTY_LOCATION, {");
  expect(source).toContain("ownedWrite: true");
});

test("anchor interception works for DOM-style event instances, not just plain objects", () => {
  const port = createFakePort("/start");
  const detach = ensureRouteState(port);
  const pushed: string[] = [];
  port.history.pushState = (_state, _unused, url) => {
    pushed.push(url);
  };

  class FakeMouseEvent {
    button = 0;
    defaultPrevented = false;
    target: unknown;
    constructor(target: unknown) {
      this.target = target;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
  }

  const anchor = { closest: () => ({ getAttribute: () => "/go" }) };
  const event = new FakeMouseEvent(anchor);
  port.emit("document:click", event);

  expect(pushed).toEqual(["/go"]);
  expect(event.defaultPrevented).toBe(true);

  detach();
  resetRouteForTests();
});

test("popstate restores for DOM-style event instances", () => {
  const port = createFakePort("/list", { [ROUTE_STATE_KEY]: { depth: 1 } });
  const detach = ensureRouteState(port);
  recordScroll(480);

  class FakePopStateEvent {
    state: unknown;
    constructor(state: unknown) {
      this.state = state;
    }
  }

  port.emit("popstate", new FakePopStateEvent({ [ROUTE_STATE_KEY]: { depth: 1 } }));
  restoreScroll();
  expect(port.calls.scrollTo).toEqual([[0, 480]]);

  detach();
});
