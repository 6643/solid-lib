import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { mustRun, which } from "./harness/proc.ts";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const VP_COMMAND = which("vp") ?? "vp";

const listFiles = (root: string): string[] => {
  const entries = readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory()
      ? listFiles(path).map((file) => join(entry.name, file))
      : [entry.name];
  });
};

test("demo Vite build emits a client bundle without the TypeScript compiler runtime", async () => {
  const demoRoot = join(import.meta.dirname, "..", "demo");

  await mustRun(VP_COMMAND, ["run", "build"], { cwd: demoRoot });

  const distRoot = join(demoRoot, "dist", "client");
  const files = listFiles(distRoot);
  const jsFiles = files.filter((entry) => entry.endsWith(".js"));
  const assetPath = join(distRoot, "assets", "demo.txt");
  const indexSource = await readText(join(distRoot, "index.html"));

  expect(files).toContain("index.html");
  expect(files).toContain("favicon.svg");
  expect(indexSource).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
  expect(jsFiles.length).toBeGreaterThan(0);
  expect(await readText(assetPath)).toContain("demo asset from assetsDirs");

  for (const jsFile of jsFiles) {
    const source = await readText(join(distRoot, jsFile));
    expect(source.includes("SemanticDiagnosticsBuilderProgram")).toBe(false);
  }
});

test("demo uses the Solid 2 native Vite plugin entry", async () => {
  const source = await readText(join(import.meta.dirname, "..", "demo", "vite.config.ts"));

  expect(source).toContain('solid({ start: true, compiler: "native", ssr: false })');
  expect(source).toContain('from "@solidjs/vite-plugin"');
  expect(source).toContain('"solid-lib": fileURLToPath(new URL("../src/_.ts", import.meta.url))');
  expect(source).toContain(
    '"solid-lib/ui.css": fileURLToPath(new URL("../src/_.css", import.meta.url))',
  );
  expect(source).toContain("watch: { usePolling: true }");
  expect(source).not.toContain("@solidjs/start");
  expect(source).not.toContain("solid-lib/builder");
});

test("theme demo uses inset background and disabled color for the disabled swatch", async () => {
  const source = await readText(
    join(import.meta.dirname, "..", "demo", "src", "pages", "ThemePage.tsx"),
  );

  expect(source).toContain('background: "var(--inset-bg)", color: "var(--disabled-color)"');
});
