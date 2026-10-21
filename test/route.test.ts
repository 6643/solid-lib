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
