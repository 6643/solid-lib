import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { join } from "node:path";

test("ui theme css exports the expected variable contract", async () => {
	const css = await readText(join(import.meta.dirname, "..", "src/_.css"));

	expect(css).toContain("--base-bg");
	expect(css).not.toContain("--page-bg");
	expect(css).not.toContain("--page-fg");
	expect(css).toContain("--raised-bg");
	expect(css).toContain("--inset-bg");
	expect(css).not.toContain("--sunken-bg");
	expect(css).not.toContain("--sunken-fg");
	expect(css).not.toContain("--disabled-bg");
	expect(css).not.toContain("--disabled-fg");
	expect(css).toContain("--disabled-color");
	expect(css).toContain("--error-color");
	expect(css).toContain("transition:");
	expect(css).toContain('[data-theme-mode="dark"]');
});

test("ui theme css maps semantic colors to the approved grey scale values", async () => {
	const css = await readText(join(import.meta.dirname, "..", "src", "_.css"));

	expect(css).toMatch(
		/:root[\s\S]*?--base-bg:\s*#eeeeee;[\s\S]*?--base-fg:\s*#212121;[\s\S]*?--raised-bg:\s*#fafafa;[\s\S]*?--raised-fg:\s*#212121;[\s\S]*?--inset-bg:\s*#e0e0e0;[\s\S]*?--inset-fg:\s*#424242;/,
	);
	expect(css).toMatch(
		/\[data-theme-mode="dark"\][\s\S]*?--base-bg:\s*#212121;[\s\S]*?--base-fg:\s*#fafafa;[\s\S]*?--raised-bg:\s*#303030;[\s\S]*?--raised-fg:\s*#f5f5f5;[\s\S]*?--inset-bg:\s*#424242;[\s\S]*?--inset-fg:\s*#e0e0e0;/,
	);
	expect(css).not.toMatch(
		/--(?:base-bg|base-fg|raised-bg|raised-fg|inset-bg|inset-fg):\s*var\(--color-grey-/,
	);
});
