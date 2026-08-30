import { expect, test } from "bun:test";
import { $ } from "bun";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const BUN_COMMAND = Bun.which("bun") ?? "bun";

const listFiles = (root: string): string[] => {
  const entries = readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? listFiles(path).map((file) => join(entry.name, file)) : [entry.name];
  });
};

test("demo Vite build emits a client bundle without the TypeScript compiler runtime", async () => {
  const demoRoot = join(import.meta.dir, "..", "demo");

  await $`${BUN_COMMAND} run build`.cwd(demoRoot);

  const distRoot = join(demoRoot, "dist", "client");
  const files = listFiles(distRoot);
  const jsFiles = files.filter((entry) => entry.endsWith(".js"));
  const assetPath = join(distRoot, "assets", "demo.txt");
  const indexSource = await Bun.file(join(distRoot, "index.html")).text();

  expect(files).toContain("index.html");
  expect(files).toContain("favicon.svg");
  expect(indexSource).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
  expect(jsFiles.length).toBeGreaterThan(0);
  expect(await Bun.file(assetPath).text()).toContain("demo asset from assetsDirs");

  for (const jsFile of jsFiles) {
    const source = await Bun.file(join(distRoot, jsFile)).text();
    expect(source.includes("SemanticDiagnosticsBuilderProgram")).toBe(false);
  }
});

test("demo uses the Solid 2 native Vite plugin entry", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "demo", "vite.config.ts")).text();

  expect(source).toContain('solid({ start: true, compiler: "native", ssr: false })');
  expect(source).toContain('from "@solidjs/vite-plugin"');
  expect(source).toContain('"solid-lib": fileURLToPath(new URL("../src/_.ts", import.meta.url))');
  expect(source).toContain('"solid-lib/ui.css": fileURLToPath(new URL("../src/_.css", import.meta.url))');
  expect(source).toContain("watch: { usePolling: true }");
  expect(source).not.toContain("@solidjs/start");
  expect(source).not.toContain("solid-lib/builder");
});

test("theme demo uses inset background and disabled color for the disabled swatch", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "demo", "src", "pages", "ThemePage.tsx")).text();

  expect(source).toContain('background: "var(--inset-bg)", color: "var(--disabled-color)"');
});
