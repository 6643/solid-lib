import { $ } from "bun";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const mode = process.argv[2] ?? "local";
const repoRoot = resolve(import.meta.dir, "..");
const consumerRoot = mkdtempSync(join(tmpdir(), "solid-local-consumer-"));
const packRoot = mkdtempSync(join(tmpdir(), "solid-local-pack-"));

const writeJson = (filePath: string, value: unknown): void => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const toFileDependency = (targetPath: string): string => {
  const relativePath = relative(consumerRoot, targetPath).replace(/\\/g, "/");
  return `file:${relativePath === "" ? "." : relativePath}`;
};

const solidJsSpecifier = JSON.parse(await Bun.file(join(repoRoot, "package.json")).text()).peerDependencies["solid-js"] as string;

try {
  if (mode !== "local" && mode !== "pack") {
    throw new Error(`Unsupported smoke mode: ${mode}`);
  }

  const packedTarballPath =
    mode === "pack" ? (await $`bun pm pack --destination ${packRoot} --quiet`.cwd(repoRoot).quiet().text()).trim() : undefined;
  const solidLibDependency = mode === "pack" ? toFileDependency(packedTarballPath!) : toFileDependency(repoRoot);

  mkdirSync(join(consumerRoot, "src"), { recursive: true });

  writeJson(join(consumerRoot, "package.json"), {
    name: "solid-lib-local-consumer",
    private: true,
    type: "module",
    scripts: {
      build: "solid-build",
    },
    dependencies: {
      "solid-js": solidJsSpecifier,
      "solid-lib": solidLibDependency,
    },
  });

  writeJson(join(consumerRoot, "tsconfig.json"), {
    compilerOptions: {
      jsx: "preserve",
      jsxImportSource: "solid-js",
      module: "Preserve",
      moduleResolution: "bundler",
      target: "ESNext",
      types: ["bun"],
      skipLibCheck: true,
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
  });

  writeFileSync(
    join(consumerRoot, "src", "_.tsx"),
    [
      'import { Route, parseParam, pushRoute } from "solid-lib/route";',
      'import { Card, FilledButton, IconButton, Input, OutlinedButton, TextButton, initializeThemeMode, setThemeMode } from "solid-lib/ui";',
      'import "solid-lib/ui.css";',
      "",
      'const iconMinus = \'<path d="M240-510h480v60H240z"/>\';',
      "",
      "initializeThemeMode();",
      'setThemeMode("dark");',
      "",
      "const Home = () => {",
      "  return (",
      "    <Card>",
      '      <h1>UI Smoke</h1>',
      '      <Input value="smoke@example.com" />',
      '      <div style={{ display: "flex", gap: "12px", "margin-top": "16px", "flex-wrap": "wrap" }}>',
      '        <TextButton text="Idle" />',
      '        <OutlinedButton text="Outline" />',
      '        <FilledButton text="Go" tap={() => pushRoute("/search?page=2")} />',
      '        <IconButton aria-label="Icon" icon={iconMinus} />',
      "      </div>",
      "    </Card>",
      "  );",
      "};",
      "",
      "const Search = () => {",
      '  const page = parseParam("page", 1);',
      '  return <p>Page: {page()}</p>;',
      "};",
      "",
      "const App = () => {",
      "  return (",
      "    <>",
      '      <Route path=\"/\" component={Home} />',
      '      <Route path=\"/search\" component={Search} />',
      "    </>",
      "  );",
      "};",
      "",
      "export default App;",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(consumerRoot, "solid-build.config.ts"),
    [
      "export default {",
      '  appTitle: "solid-lib local consumer",',
      '  outDir: "dist",',
      "};",
      "",
    ].join("\n"),
  );

  await $`bun install`.cwd(consumerRoot);
  await $`bun run build`.cwd(consumerRoot);

  const distRoot = join(consumerRoot, "dist");
  if (!existsSync(join(distRoot, "index.html"))) {
    throw new Error(`Missing built HTML output: ${join(distRoot, "index.html")}`);
  }

  if (!readdirSync(distRoot).some((entry) => entry.endsWith(".js"))) {
    throw new Error(`Expected at least one JavaScript output in ${distRoot}`);
  }

  if (!readdirSync(distRoot).some((entry) => entry.endsWith(".css"))) {
    throw new Error(`Expected at least one CSS output in ${distRoot}`);
  }

  if (mode === "pack" && existsSync(join(consumerRoot, "node_modules", "solid-lib", "node_modules", "solid-js"))) {
    throw new Error("Expected solid-lib to reuse the consumer's top-level solid-js installation");
  }

  const largestJsFile = readdirSync(distRoot)
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => ({ entry, size: readFileSync(join(distRoot, entry), "utf8").length }))
    .sort((left, right) => right.size - left.size)[0];

  if (largestJsFile) {
    const largestJsSource = readFileSync(join(distRoot, largestJsFile.entry), "utf8");
    if (largestJsSource.includes("SemanticDiagnosticsBuilderProgram")) {
      throw new Error(`Expected browser bundle ${largestJsFile.entry} to exclude the TypeScript compiler runtime`);
    }
  }

  const duplicateSolidWarningCount = readdirSync(distRoot)
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => readFileSync(join(distRoot, entry), "utf8"))
    .reduce((count, source) => count + (source.match(/You appear to have multiple instances of Solid/g)?.length ?? 0), 0);

  if (duplicateSolidWarningCount > 1) {
    throw new Error(`Expected at most one Solid runtime warning string in the consumer bundle, got ${duplicateSolidWarningCount}`);
  }
} finally {
  rmSync(packRoot, { force: true, recursive: true });
  rmSync(consumerRoot, { force: true, recursive: true });
}
