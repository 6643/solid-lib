import { expect, test } from "./harness/test.ts";
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
  ROUTE_STATE_KEY,
  getRouteBackPath,
  readLocation,
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
