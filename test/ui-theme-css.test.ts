import { expect, test } from "bun:test";
import { join } from "node:path";

test("ui theme css exports the expected variable contract", async () => {
  const css = await Bun.file(join(import.meta.dir, "..", "src/ui/_.css")).text();

  expect(css).toContain("--bg-base");
  expect(css).toContain("--fg-primary");
  expect(css).toContain("--bg-raised");
  expect(css).toContain("--fg-secondary");
  expect(css).toContain("--bg-inset");
  expect(css).toContain("--disabled-color");
  expect(css).toContain("--error-color");
  expect(css).toContain("transition:");
  expect(css).toContain('[theme="dark"]');
});
