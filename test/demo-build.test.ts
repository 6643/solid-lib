import { expect, test } from "bun:test";
import { $ } from "bun";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const BUN_COMMAND = Bun.which("bun") ?? "bun";

test("demo build excludes the TypeScript compiler runtime from browser chunks", async () => {
  const demoRoot = join(import.meta.dir, "..", "demo");

  await $`${BUN_COMMAND} run build`.cwd(demoRoot);

  const distRoot = join(demoRoot, "dist");
  const jsFiles = readdirSync(distRoot).filter((entry) => entry.endsWith(".js"));

  expect(jsFiles.length).toBeGreaterThan(0);

  for (const jsFile of jsFiles) {
    const source = await Bun.file(join(distRoot, jsFile)).text();
    expect(source.includes("SemanticDiagnosticsBuilderProgram")).toBe(false);
  }
});

test("theme demo keeps the disabled swatch readable against the disabled background", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "demo", "src", "pages", "ThemePage.tsx")).text();

  expect(source).toContain('background: "var(--disabled-color)", color: "var(--primary-fg)"');
});
