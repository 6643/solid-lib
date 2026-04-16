import { expect, test } from "bun:test";
import { join } from "node:path";

test("ui theme css exports the expected variable contract", async () => {
  const css = await Bun.file(join(import.meta.dir, "..", "src/ui/_.css")).text();
  const themeColorCount = css.match(/--theme-color:/g)?.length ?? 0;
  const errorColorCount = css.match(/--error-color:/g)?.length ?? 0;

  expect(css).toContain("--base-bg");
  expect(css).toContain("--base-fg");
  expect(css).toContain("--raised-bg");
  expect(css).toContain("--raised-fg");
  expect(css).toContain("--inset-bg");
  expect(css).toContain("--inset-fg");
  expect(css).toContain("--disabled-bg");
  expect(css).toContain("--disabled-fg");
  expect(css).toContain("--theme-color");
  expect(css).toContain("--error-color");
  expect(css).toContain("color-scheme: light;");
  expect(css).toContain('html[data-theme-mode="dark"]');
  expect(css).not.toContain("data-theme-resolved-mode");
  expect(css).not.toContain('html[data-theme="dark"]');
  expect(css).not.toContain("prefers-color-scheme");
  expect(themeColorCount).toBe(1);
  expect(errorColorCount).toBe(1);
});
