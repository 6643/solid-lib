import { expect, test } from "bun:test";
import { $ } from "bun";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

test("demo build excludes the TypeScript compiler runtime from browser chunks", async () => {
  const demoRoot = join(import.meta.dir, "..", "demo");

  await $`bun run build`.cwd(demoRoot);

  const distRoot = join(demoRoot, "dist");
  const jsFiles = readdirSync(distRoot).filter((entry) => entry.endsWith(".js"));

  expect(jsFiles.length).toBeGreaterThan(0);

  for (const jsFile of jsFiles) {
    const source = readFileSync(join(distRoot, jsFile), "utf8");
    expect(source.includes("SemanticDiagnosticsBuilderProgram")).toBe(false);
  }
});
