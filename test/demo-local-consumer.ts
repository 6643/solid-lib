import { $ } from "bun";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const mode = Bun.argv[2] ?? "local";
const repoRoot = resolve(import.meta.dir, "..");
const tempRoot = resolve(repoRoot, "..", "..", "..");
const consumerRoot = mkdtempSync(join(tempRoot, "solid-local-consumer-"));
const packRoot = mkdtempSync(join(tempRoot, "solid-local-pack-"));

const writeJson = (filePath: string, value: unknown): void => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const toFileDependency = (targetPath: string): string => {
  const relativePath = relative(consumerRoot, targetPath).replace(/\\/g, "/");
  return `file:${relativePath === "" ? "." : relativePath}`;
};

const listFiles = (root: string): string[] => {
  const entries = readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? listFiles(path).map((file) => join(entry.name, file)) : [entry.name];
  });
};

const solidJsSpecifier = JSON.parse(await Bun.file(join(repoRoot, "package.json")).text()).peerDependencies["solid-js"] as string;

try {
  if (mode !== "local" && mode !== "pack") {
    throw new Error(`Unsupported smoke mode: ${mode}`);
  }

  const packedTarballPath =
    mode === "pack" ? (await $`bun pm pack --destination ${packRoot} --quiet`.cwd(repoRoot).quiet().text()).trim() : undefined;
  const rootPackageJson = JSON.parse(await Bun.file(join(repoRoot, "package.json")).text()) as {
    dependencies: Record<string, string>;
  };
  const solidWebSpecifier = rootPackageJson.dependencies["@solidjs/web"]!;

  const dependencies: Record<string, string> = {
    "@solidjs/router": "2.0.0-next.18",
    "@solidjs/web": solidWebSpecifier,
    "solid-js": solidJsSpecifier,
  };
  if (mode === "pack") {
    dependencies["solid-lib"] = toFileDependency(packedTarballPath!);
  }

  mkdirSync(join(consumerRoot, "src"), { recursive: true });

  writeJson(join(consumerRoot, "package.json"), {
    name: "solid-lib-local-consumer",
    private: true,
    type: "module",
    scripts: {
      build: "vite build",
    },
    dependencies,
    devDependencies: {
      "@solidjs/compiler": "2.0.0-rc.3",
      "@solidjs/vite-plugin": "3.0.0-next.34",
      "typescript": "7.0.2",
      "vite": "8.2.2",
    },
  });

  writeJson(join(consumerRoot, "tsconfig.json"), {
    compilerOptions: {
      jsx: "preserve",
      jsxImportSource: "@solidjs/web",
      module: "Preserve",
      moduleResolution: "bundler",
      target: "ESNext",
      types: ["bun"],
      skipLibCheck: true,
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
  });

  writeFileSync(
    join(consumerRoot, "src", "App.tsx"),
    [
      'import { createRouter, useNavigate, useSearchParams } from "@solidjs/router";',
      'import { Card, FilledButton, IconButton, OutlinedButton, TextButton, TextInput, initializeThemeMode, setThemeMode } from "solid-lib";',
      'import "solid-lib/ui.css";',
      "",
      'const iconMinus = \'<path d="M240-510h480v60H240z"/>\';',
      "",
      "initializeThemeMode();",
      'setThemeMode("dark");',
      "",
      "const Home = () => {",
      "  const navigate = useNavigate();",
      "  return (",
      "    <Card>",
      '      <h1>UI Smoke</h1>',
      '      <TextInput value="smoke@example.com" />',
      '      <div style={{ display: "flex", gap: "12px", "margin-top": "16px", "flex-wrap": "wrap" }}>',
      '        <TextButton text="Idle" />',
      '        <OutlinedButton text="Outline" />',
      '        <FilledButton text="Go" tap={() => navigate("/search?page=2")} />',
      '        <IconButton icon={iconMinus} />',
      '        <FilledButton disabled text="Disabled" />',
      "      </div>",
      "    </Card>",
      "  );",
      "};",
      "",
      "const Search = () => {",
      "  const [search] = useSearchParams();",
      '  return <p>Page: {search.page ?? "missing"}</p>;',
      "};",
      "",
      "const NotFound = () => <p>Not found</p>;",
      "",
      "const Router = createRouter({",
      "  routes: [",
      "    { path: \"/\", component: Home },",
      "    { path: \"/search\", component: Search },",
      "    { path: \"*404\", component: NotFound },",
      "  ],",
      "});",
      "",
      "const App = () => <Router>{props => props.children}</Router>;",
      "",
      "export default App;",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(consumerRoot, "vite.config.ts"),
    [
      'import { defineConfig } from "vite";',
      'import solid from "@solidjs/vite-plugin";',
      "",
      "export default defineConfig({",
      '  plugins: [solid({ start: true, compiler: "native", ssr: false })],',
      "});",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(consumerRoot, "src", "Document.tsx"),
    [
      'import type { ParentProps } from "solid-js";',
      'import { HydrationScript } from "@solidjs/web";',
      "",
      "export default function Document(props: ParentProps) {",
      "  return (",
      '    <html lang="en">',
      "      <head>",
      '        <meta charset="utf-8" />',
      '        <meta name="viewport" content="width=device-width, initial-scale=1" />',
      '        <title>solid-lib local consumer</title>',
      "        <HydrationScript />",
      "      </head>",
      "      <body>{props.children}</body>",
      "    </html>",
      "  );",
      "}",
      "",
    ].join("\n"),
  );

  await $`bun install`.cwd(consumerRoot);
  if (mode === "local") {
    mkdirSync(join(consumerRoot, "node_modules"), { recursive: true });
    symlinkSync(repoRoot, join(consumerRoot, "node_modules", "solid-lib"), "dir");
  }
  await $`bun run build`.cwd(consumerRoot);

  const distRoot = join(consumerRoot, "dist", "client");
  if (!existsSync(join(distRoot, "index.html"))) {
    throw new Error(`Missing built HTML output: ${join(distRoot, "index.html")}`);
  }

  const distFiles = listFiles(distRoot);
  const jsFiles = distFiles.filter((entry) => entry.endsWith(".js"));
  if (jsFiles.length === 0) {
    throw new Error(`Expected at least one JavaScript output in ${distRoot}`);
  }

  const cssFiles = distFiles.filter((entry) => entry.endsWith(".css"));
  if (cssFiles.length === 0) {
    throw new Error(`Expected at least one CSS output in ${distRoot}`);
  }

  if (mode === "pack" && existsSync(join(consumerRoot, "node_modules", "solid-lib", "node_modules", "solid-js"))) {
    throw new Error("Expected solid-lib to reuse the consumer's top-level solid-js installation");
  }

  const largestJsFile = jsFiles
    .map((entry) => ({ entry, size: readFileSync(join(distRoot, entry), "utf8").length }))
    .sort((left, right) => right.size - left.size)[0];

  if (largestJsFile) {
    const largestJsSource = readFileSync(join(distRoot, largestJsFile.entry), "utf8");
    if (largestJsSource.includes("SemanticDiagnosticsBuilderProgram")) {
      throw new Error(`Expected browser bundle ${largestJsFile.entry} to exclude the TypeScript compiler runtime`);
    }
  }

  const duplicateSolidWarningCount = jsFiles
    .map((entry) => readFileSync(join(distRoot, entry), "utf8"))
    .reduce((count, source) => count + (source.match(/You appear to have multiple instances of Solid/g)?.length ?? 0), 0);

  if (duplicateSolidWarningCount > 1) {
    throw new Error(`Expected at most one Solid runtime warning string in the consumer bundle, got ${duplicateSolidWarningCount}`);
  }
} finally {
  rmSync(packRoot, { force: true, recursive: true });
  rmSync(consumerRoot, { force: true, recursive: true });
}
