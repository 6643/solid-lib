import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { join } from "node:path";

const readSource = (path: string) => readText(join(import.meta.dirname, "..", path));

test("useScrollEnd binds refs through createEffect with cleanup", async () => {
	const source = await readSource("src/useScrollEnd.ts");

	expect(source).toContain("createEffect(");
	expect(source).toContain("readEl(ref)");
	expect(source).toContain("return listenScrollEnd(el, hook, debounceMs)");
	expect(source).toContain("debouncedScroll.cancel()");
	expect(source).not.toContain("createTrackedEffect");
	expect(source).not.toContain("onCleanup");
});

test("useKeepScroll restores scroll through createEffect with cleanup", async () => {
	const source = await readSource("src/useKeepScroll.ts");

	expect(source).toContain(
		"useScrollEnd(ref, (top) => setPos(page, key, top), debounceMs, owner);",
	);
	expect(source).toContain("createEffect(");
	expect(source).toContain("readEl(ref)");
	expect(source).toContain("return restoreScrollTop(el)");
	expect(source).not.toContain("createTrackedEffect");
	expect(source).not.toContain("onCleanup");
});
