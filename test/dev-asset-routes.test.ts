import { expect, test } from "bun:test";

import { isConfiguredAssetPathname, isSpaPathname } from "../src/builder/dev";

test("isConfiguredAssetPathname matches each assetsDirs outputDirName", () => {
  expect(isConfiguredAssetPathname("/public/demo.txt", ["public"])).toBe(true);
  expect(isConfiguredAssetPathname("/public", ["public"])).toBe(true);
  expect(isConfiguredAssetPathname("/public/", ["public"])).toBe(true);
  expect(isConfiguredAssetPathname("/assets/x", ["public"])).toBe(false);
  expect(isConfiguredAssetPathname("/assets/x", ["assets", "public"])).toBe(true);
  expect(isConfiguredAssetPathname("/app", ["public"])).toBe(false);
});

test("isSpaPathname excludes configured asset prefixes and static extensions", () => {
  expect(isSpaPathname("GET", "/profile", ["public"])).toBe(true);
  expect(isSpaPathname("GET", "/public/missing", ["public"])).toBe(false);
  expect(isSpaPathname("GET", "/public", ["public"])).toBe(false);
  expect(isSpaPathname("GET", "/assets/x", ["assets"])).toBe(false);
  expect(isSpaPathname("GET", "/file.txt", ["public"])).toBe(false);
  expect(isSpaPathname("POST", "/profile", ["public"])).toBe(false);
  expect(isSpaPathname("GET", "/__solid_dev/events", ["public"])).toBe(false);
});
