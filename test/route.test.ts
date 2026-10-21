import { expect, test } from "./harness/test.ts";
import { createFakePort } from "./route-fakes.ts";
import {
  ensureRouteState,
  isFallbackRoutePath,
  matchesExactRoute,
  normalizePathname,
  parseParam,
  parseParams,
  readLocation,
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
