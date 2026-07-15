import { expect, test } from "bun:test";
import { join } from "node:path";

const readSource = (path: string) => Bun.file(join(import.meta.dir, "..", path)).text();

test("useScrollEnd binds refs through createEffect with cleanup", async () => {
  const source = await readSource("src/utils/useScrollEnd.ts");

  expect(source).toContain("createEffect(");
  expect(source).toContain("readEl(ref)");
  expect(source).toContain("return listenScrollEnd(el, hook, debounceMs)");
  expect(source).toContain("debouncedScroll.cancel()");
  expect(source).not.toContain("createTrackedEffect");
  expect(source).not.toContain("onCleanup");
});

test("useKeepScroll restores scroll through createEffect with cleanup", async () => {
  const source = await readSource("src/utils/useKeepScroll.ts");

  expect(source).toContain("useScrollEnd(ref, (top) => setPos(page, key, top), debounceMs, owner);");
  expect(source).toContain("createEffect(");
  expect(source).toContain("readEl(ref)");
  expect(source).toContain("return restoreScrollTop(el)");
  expect(source).not.toContain("createTrackedEffect");
  expect(source).not.toContain("onCleanup");
});
