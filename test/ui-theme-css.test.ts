import { expect, test } from "bun:test";
import { join } from "node:path";

test("ui theme css exports the expected variable contract", async () => {
  const css = await Bun.file(join(import.meta.dir, "..", "src/ui/_.css")).text();

  expect(css).toContain("--base-bg");
  expect(css).toContain("--page-bg");
  expect(css).toContain("--page-fg");
  expect(css).toContain("--raised-bg");
  expect(css).toContain("--inset-bg");
  expect(css).toContain("--disabled-bg");
  expect(css).toContain("--disabled-color");
  expect(css).toContain("--error-color");
  expect(css).toContain("transition:");
  expect(css).toContain('[data-theme-mode="dark"]');
});
