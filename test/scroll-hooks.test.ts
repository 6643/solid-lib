import { expect, test } from "bun:test";
import { join } from "node:path";

const readSource = (path: string) => Bun.file(join(import.meta.dir, "..", path)).text();

test("useScrollEnd binds direct HTMLElement refs without creating tracked effects", async () => {
  const source = await readSource("src/utils/useScrollEnd.ts");

  expect(source).toContain('if (typeof ref !== "function")');
  expect(source).toContain("const cleanup = listenScrollEnd(ref, hook, debounceMs);");
  expect(source).toContain("if (getOwner()) onCleanup(cleanup);");
  expect(source).toContain("createTrackedEffect(() =>");
});

test("useKeepScroll keeps HTMLElement ref callbacks outside tracked effects", async () => {
  const source = await readSource("src/utils/useKeepScroll.ts");

  expect(source).toContain('if (typeof ref !== "function")');
  expect(source).toContain("useScrollEnd(ref, (top) => setPos(page, key, top), debounceMs);");
  expect(source).toContain("const cleanup = restoreScrollTop(ref);");
  expect(source).toContain("if (cleanup && getOwner()) onCleanup(cleanup);");
});
