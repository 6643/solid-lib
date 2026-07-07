import { afterEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../src/builder/config";
import { startDevServer } from "../src/builder/dev";

const noProxyHosts = ["127.0.0.1", "localhost", "::1"];
const existingNoProxy = process.env.NO_PROXY ?? process.env.no_proxy;
const mergedNoProxy = Array.from(new Set([...(existingNoProxy ? [existingNoProxy] : []), ...noProxyHosts])).join(",");

process.env.NO_PROXY = mergedNoProxy;
process.env.no_proxy = mergedNoProxy;

const createdDirs: string[] = [];
const stopFns: Array<() => void> = [];

afterEach(() => {
  while (stopFns.length) {
    stopFns.pop()?.();
  }

  for (const dir of createdDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

const writeMinimalApp = (appRoot: string) => {
  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default function App() {",
      "  return <main>Minimal app</main>;",
      "}",
      "",
    ].join("\n"),
  );
};

test("solid-lib dev serves html, js, css, and sse without writing dist", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });
  mkdirSync(join(appRoot, "assets"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      'import styles from "./App.module.css";',
      "",
      "export default () => {",
      '  return <main class={styles.shell}>Hello solid-lib dev</main>;',
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "src", "App.module.css"),
    [".shell {", "  color: rgb(12, 34, 56);", "}", ""].join("\n"),
  );

  writeFileSync(
    join(appRoot, "src", "css-modules.d.ts"),
    ['declare module "*.module.css" {', "  const classes: Record<string, string>;", "  export default classes;", "}", ""].join("\n"),
  );

  writeFileSync(join(appRoot, "assets", "demo.txt"), "hello dev asset\n");

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0 });
  stopFns.push(() => devServer.stop());

  expect(existsSync(join(appRoot, "dist"))).toBe(false);

  const htmlResponse = await fetch(`${devServer.origin}/`);
  expect(htmlResponse.status).toBe(200);
  const html = await htmlResponse.text();
  expect(html).toContain("/__solid_dev/events");

  const entryMatch = html.match(/src="\.\/([^"]+\.js)"/);
  const cssMatch = html.match(/href="\.\/([^"]+\.css)"/);

  expect(entryMatch?.[1]).toBeDefined();
  expect(cssMatch?.[1]).toBeDefined();

  const jsResponse = await fetch(`${devServer.origin}/${entryMatch![1]}`);
  expect(jsResponse.status).toBe(200);

  const cssResponse = await fetch(`${devServer.origin}/${cssMatch![1]}`);
  expect(cssResponse.status).toBe(200);

  const assetResponse = await fetch(`${devServer.origin}/assets/demo.txt`);
  expect(assetResponse.status).toBe(200);
  expect(await assetResponse.text()).toContain("hello dev asset");

  const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
  expect(eventsResponse.status).toBe(200);
  expect(eventsResponse.headers.get("content-type")).toContain("text/event-stream");
});

test("solid-lib dev serves the app html for SPA route paths", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-spa-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>SPA route html</main>;',
      "}",
      "",
    ].join("\n"),
  );

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0 });
  stopFns.push(() => devServer.stop());

  const response = await fetch(`${devServer.origin}/search?page=2`);
  expect(response.status).toBe(200);

  const html = await response.text();
  expect(html).toContain("<div id=\"app\"></div>");
  expect(html).toContain("/__solid_dev/events");
});

test("solid-lib dev rebuilds and emits reload events when source files change", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-watch-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });
  mkdirSync(join(appRoot, "assets"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>Before rebuild</main>;',
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(join(appRoot, "assets", "demo.txt"), "before rebuild asset\n");

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0, pollIntervalMs: 50 });
  stopFns.push(() => devServer.stop());

  const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
  expect(eventsResponse.body).toBeDefined();

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>After rebuild</main>;',
      "}",
      "",
    ].join("\n"),
  );

  const reloadEvent = await readReloadEvent(eventsResponse.body!);
  expect(reloadEvent).toContain("reload");

  const html = await (await fetch(`${devServer.origin}/`)).text();
  const entryMatch = html.match(/src="\.\/([^"]+\.js)"/);
  expect(entryMatch?.[1]).toBeDefined();

  const jsResponse = await fetch(`${devServer.origin}/${entryMatch![1]}`);
  const jsSource = await jsResponse.text();
  expect(jsSource).toContain("After rebuild");

  const assetResponse = await fetch(`${devServer.origin}/assets/demo.txt`);
  expect(assetResponse.status).toBe(200);
  expect(await assetResponse.text()).toContain("before rebuild asset");
});

test("solid-lib dev uses devPort from config when no explicit port override is provided", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-port-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>Port config</main>;',
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      "  devPort: 4321,",
      '  appTitle: "Port config",',
      "});",
      "",
    ].join("\n"),
  );

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1" });
  stopFns.push(() => devServer.stop());

  expect(devServer.port).toBe(4321);
});

test("solid-lib dev watches the full app source tree, not only the entry directory", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-tree-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src", "app"), { recursive: true });
  mkdirSync(join(appRoot, "src", "shared"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(join(appRoot, "src", "shared", "message.ts"), 'export const message = "Before sibling rebuild";\n');
  writeFileSync(
    join(appRoot, "src", "app", "_.tsx"),
    [
      'import { message } from "../shared/message";',
      "",
      "export default () => {",
      "  return <main>{message}</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  rootComponentFile: "src/app/_.tsx",',
      "});",
      "",
    ].join("\n"),
  );

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0, pollIntervalMs: 50 });
  stopFns.push(() => devServer.stop());

  const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
  expect(eventsResponse.body).toBeDefined();

  writeFileSync(join(appRoot, "src", "shared", "message.ts"), 'export const message = "After sibling rebuild";\n');

  const reloadEvent = await readReloadEvent(eventsResponse.body!);
  expect(reloadEvent).toContain("reload");

  const html = await (await fetch(`${devServer.origin}/`)).text();
  const entryMatch = html.match(/src="\.\/([^"]+\.js)"/);
  expect(entryMatch?.[1]).toBeDefined();

  const jsResponse = await fetch(`${devServer.origin}/${entryMatch![1]}`);
  const jsSource = await jsResponse.text();
  expect(jsSource).toContain("After sibling rebuild");
});

test("solid-lib dev also watches the full source tree when rootComponentFile uses ./src path", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-dot-tree-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src", "app"), { recursive: true });
  mkdirSync(join(appRoot, "src", "shared"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(join(appRoot, "src", "shared", "message.ts"), 'export const message = "Before dot sibling rebuild";\n');
  writeFileSync(
    join(appRoot, "src", "app", "_.tsx"),
    [
      'import { message } from "../shared/message";',
      "",
      "export default () => {",
      "  return <main>{message}</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  rootComponentFile: "./src/app/_.tsx",',
      "});",
      "",
    ].join("\n"),
  );

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0, pollIntervalMs: 50 });
  stopFns.push(() => devServer.stop());

  const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
  expect(eventsResponse.body).toBeDefined();

  writeFileSync(join(appRoot, "src", "shared", "message.ts"), 'export const message = "After dot sibling rebuild";\n');

  const reloadEvent = await readReloadEvent(eventsResponse.body!);
  expect(reloadEvent).toContain("reload");

  const html = await (await fetch(`${devServer.origin}/`)).text();
  const entryMatch = html.match(/src="\.\/([^"]+\.js)"/);
  expect(entryMatch?.[1]).toBeDefined();

  const jsResponse = await fetch(`${devServer.origin}/${entryMatch![1]}`);
  const jsSource = await jsResponse.text();
  expect(jsSource).toContain("After dot sibling rebuild");
});

test("solid-lib dev reloads updated config values after config file changes", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-config-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>Config reload</main>;',
      "}",
      "",
    ].join("\n"),
  );

  const configPath = join(appRoot, "config.ts");
  writeFileSync(
    configPath,
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  appTitle: "Before config reload",',
      "});",
      "",
    ].join("\n"),
  );

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0, pollIntervalMs: 50 });
  stopFns.push(() => devServer.stop());

  const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
  expect(eventsResponse.body).toBeDefined();

  writeFileSync(
    configPath,
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  appTitle: "After config reload",',
      "});",
      "",
    ].join("\n"),
  );

  const reloadEvent = await readReloadEvent(eventsResponse.body!);
  expect(reloadEvent).toContain("reload");

  const html = await (await fetch(`${devServer.origin}/`)).text();
  expect(html).toContain("<title>After config reload</title>");
});

test("solid-lib dev reloads config values when imported helper modules change", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-config-helper-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "preserve",
          jsxImportSource: "solid-js",
          module: "Preserve",
          moduleResolution: "bundler",
          target: "ESNext",
          types: ["bun"],
          skipLibCheck: true,
        },
        include: ["src/**/*.ts", "src/**/*.tsx", "*.ts"],
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>Config helper reload</main>;',
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(join(appRoot, "title.ts"), 'export const title = "Before helper reload";\n');
  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      'import { title } from "./title";',
      "",
      "export default defineConfig({",
      "  appTitle: title,",
      "});",
      "",
    ].join("\n"),
  );

  const loadedConfig = await loadConfig(appRoot);
  const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", port: 0, pollIntervalMs: 50 });
  stopFns.push(() => devServer.stop());

  const beforeHtml = await (await fetch(`${devServer.origin}/`)).text();
  expect(beforeHtml).toContain("<title>Before helper reload</title>");

  const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
  expect(eventsResponse.body).toBeDefined();

  writeFileSync(join(appRoot, "title.ts"), 'export const title = "After helper reload";\n');

  const reloadEvent = await readReloadEvent(eventsResponse.body!);
  expect(reloadEvent).toContain("reload");

  const afterHtml = await (await fetch(`${devServer.origin}/`)).text();
  expect(afterHtml).toContain("<title>After helper reload</title>");
});

test("solid-lib dev warns that devPort changes require restart and keeps the current port", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-port-reload-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      '  return <main>Port reload</main>;',
      "}",
      "",
    ].join("\n"),
  );

  const configPath = join(appRoot, "config.ts");
  writeFileSync(
    configPath,
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      "  devPort: 4123,",
      '  appTitle: "Port before",',
      "});",
      "",
    ].join("\n"),
  );

  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((value) => String(value)).join(" "));
  };

  try {
    const loadedConfig = await loadConfig(appRoot);
    const devServer = await startDevServer(loadedConfig, { host: "127.0.0.1", pollIntervalMs: 50 });
    stopFns.push(() => devServer.stop());

    expect(devServer.port).toBe(4123);

    const eventsResponse = await fetch(`${devServer.origin}/__solid_dev/events`);
    expect(eventsResponse.body).toBeDefined();

    writeFileSync(
      configPath,
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        "  devPort: 5123,",
        '  appTitle: "Port after",',
        "});",
        "",
      ].join("\n"),
    );

    const reloadEvent = await readReloadEvent(eventsResponse.body!);
    expect(reloadEvent).toContain("reload");

    const html = await (await fetch(`${devServer.origin}/`)).text();
    expect(html).toContain("<title>Port after</title>");
    expect(devServer.port).toBe(4123);
    expect(warnings.some((warning) => warning.includes("devPort change requires restarting solid-lib dev"))).toBe(true);
  } finally {
    console.warn = originalWarn;
  }
});

test("loadConfig rejects root component files that only mention export default in strings", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-export-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      'const misleading = "export default nope";',
      "export const App = () => {",
      "  return <main>No real default export</main>;",
      "}",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib root component file must default export a component");
});

test("loadConfig rejects outDir inside the source tree when rootComponentFile uses ./src path", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-outdir-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src", "app"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "app", "_.tsx"),
    [
      "export default () => {",
      "  return <main>Outdir validation</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  rootComponentFile: "./src/app/_.tsx",',
      '  outDir: "src/dist",',
      "});",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib outDir must not be inside the app source tree");
});

test("loadConfig rejects reserved output directories before build deletion can target them", async () => {
  for (const outDir of [".git", "node_modules"]) {
    const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-reserved-outdir-"));
    createdDirs.push(appRoot);
    writeMinimalApp(appRoot);

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        `  outDir: ${JSON.stringify(outDir)},`,
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib outDir must not target a reserved project directory");
  }
});

test("loadConfig rejects output directories that overlap configured assets directories", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-assets-outdir-"));
  createdDirs.push(appRoot);
  writeMinimalApp(appRoot);
  mkdirSync(join(appRoot, "assets"), { recursive: true });

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  assetsDirs: ["assets"],',
      '  outDir: "assets",',
      "});",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib outDir must not overlap assetsDirs entries");
});

test("loadConfig rejects rootComponentFile paths outside the project root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-outside-entry-"));
  createdDirs.push(appRoot);

  const outsideComponentPath = join(process.cwd(), ".tmp-solid-config-external-app.tsx");

  writeFileSync(outsideComponentPath, 'export default () => { return <main>Outside</main>; }\n');

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        '  rootComponentFile: "../.tmp-solid-config-external-app.tsx",',
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib root component file must stay inside the project root");
  } finally {
    rmSync(outsideComponentPath, { force: true });
  }
});

test("loadConfig rejects symlinked rootComponentFile paths whose real target escapes the project root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-symlink-entry-"));
  createdDirs.push(appRoot);

  const outsideComponentPath = join(process.cwd(), ".tmp-solid-config-external-symlink-app.tsx");

  writeFileSync(outsideComponentPath, 'export default () => { return <main>Outside symlink</main>; }\n');

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });
    symlinkSync(outsideComponentPath, join(appRoot, "src", "link.tsx"));

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        '  rootComponentFile: "src/link.tsx",',
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib root component file must stay inside the project root");
  } finally {
    rmSync(outsideComponentPath, { force: true });
  }
});

test("loadConfig rejects assetsDirs outside the project root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-outside-assets-"));
  createdDirs.push(appRoot);

  const outsideAssetsPath = join(process.cwd(), ".tmp-solid-config-external-assets");

  mkdirSync(outsideAssetsPath, { recursive: true });
  writeFileSync(join(outsideAssetsPath, "demo.txt"), "outside asset\n");

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "src", "_.tsx"),
      [
        "export default () => {",
        "  return <main>Outside assets</main>;",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        '  assetsDirs: ["../.tmp-solid-config-external-assets"],',
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib assetsDirs entries must stay inside the project root");
  } finally {
    rmSync(outsideAssetsPath, { force: true, recursive: true });
  }
});

test("loadConfig rejects symlinked assetsDirs whose real target escapes the project root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-symlink-assets-"));
  createdDirs.push(appRoot);

  const outsideAssetsPath = join(process.cwd(), ".tmp-solid-config-external-symlink-assets");

  mkdirSync(outsideAssetsPath, { recursive: true });
  writeFileSync(join(outsideAssetsPath, "demo.txt"), "outside symlink asset\n");

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });
    symlinkSync(outsideAssetsPath, join(appRoot, "assets-link"));

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "src", "_.tsx"),
      [
        "export default () => {",
        "  return <main>Symlink assets</main>;",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        '  assetsDirs: ["assets-link"],',
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib assetsDirs entries must stay inside the project root");
  } finally {
    rmSync(outsideAssetsPath, { force: true, recursive: true });
  }
});

test("loadConfig rejects the project root as an assets directory", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-root-assets-"));
  createdDirs.push(appRoot);
  writeMinimalApp(appRoot);

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  assetsDirs: ["."],',
      "});",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib assetsDirs entries must not point at the project root");
});

test("loadConfig rejects assetsDirs symlinks whose real target is a reserved directory", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-reserved-assets-link-"));
  createdDirs.push(appRoot);
  writeMinimalApp(appRoot);
  mkdirSync(join(appRoot, "node_modules"), { recursive: true });
  symlinkSync(join(appRoot, "node_modules"), join(appRoot, "assets-link"), "dir");

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  assetsDirs: ["assets-link"],',
      "});",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib assetsDirs entries must not target a reserved project directory");
});

test("loadConfig rejects nested assets symlinks whose real target escapes the assets directory", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-nested-symlink-assets-"));
  createdDirs.push(appRoot);

  const outsideAssetPath = join(process.cwd(), ".tmp-solid-config-external-nested-asset.txt");
  writeFileSync(outsideAssetPath, "outside nested asset\n");

  try {
    writeMinimalApp(appRoot);
    mkdirSync(join(appRoot, "assets"), { recursive: true });
    symlinkSync(outsideAssetPath, join(appRoot, "assets", "outside.txt"));

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        '  assetsDirs: ["assets"],',
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib assetsDirs entries must not contain symlinks outside the assets directory");
  } finally {
    rmSync(outsideAssetPath, { force: true });
  }
});

test("loadConfig rejects cyclic directory symlinks inside assets directories", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-cyclic-assets-"));
  createdDirs.push(appRoot);

  writeMinimalApp(appRoot);
  mkdirSync(join(appRoot, "assets"), { recursive: true });
  symlinkSync(".", join(appRoot, "assets", "loop"), "dir");

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  assetsDirs: ["assets"],',
      "});",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib assetsDirs entries must not contain directory symlinks");
});

test("loadConfig uses the nested src directory as app source root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-nested-src-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "packages", "web", "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          jsx: "preserve",
          jsxImportSource: "solid-js",
          module: "Preserve",
          moduleResolution: "bundler",
          target: "ESNext",
          types: ["bun"],
          skipLibCheck: true,
        },
        include: ["packages/**/*.ts", "packages/**/*.tsx"],
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "packages", "web", "src", "_.tsx"),
    [
      "export default () => {",
      "  return <main>Nested src</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  rootComponentFile: "packages/web/src/_.tsx",',
      '  outDir: "packages/web-dist",',
      "});",
      "",
    ].join("\n"),
  );

  const loaded = await loadConfig(appRoot);
  expect(loaded.rootComponentPath).toBe(join(appRoot, "packages", "web", "src", "_.tsx"));
  expect(loaded.sourceRootPath).toBe(join(appRoot, "packages", "web", "src"));
  expect("rootComponentPath" in loaded.config).toBe(false);
  expect("sourceRootPath" in loaded.config).toBe(false);
  expect(loaded.config.outDirPath).toBe(join(appRoot, "packages", "web-dist"));
});

test("loadConfig rejects symlinked outDir paths", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-symlink-outdir-"));
  createdDirs.push(appRoot);

  const outsideOutDirPath = join(process.cwd(), ".tmp-solid-config-external-outdir");

  mkdirSync(outsideOutDirPath, { recursive: true });

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });
    symlinkSync(outsideOutDirPath, join(appRoot, "out-link"));

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "src", "_.tsx"),
      [
        "export default () => {",
        "  return <main>Symlink outDir</main>;",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        "",
        "export default defineConfig({",
        '  outDir: "out-link",',
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib outDir must not be a symbolic link");
  } finally {
    rmSync(outsideOutDirPath, { force: true, recursive: true });
  }
});

test("loadConfig rejects outDir paths whose existing parent escapes the project root through a symlink", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-symlink-outdir-parent-"));
  createdDirs.push(appRoot);

  const outsideOutDirPath = mkdtempSync(join(process.cwd(), ".tmp-solid-config-external-outdir-parent-"));
  createdDirs.push(outsideOutDirPath);

  writeMinimalApp(appRoot);
  symlinkSync(outsideOutDirPath, join(appRoot, "out-link"));

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  outDir: "out-link/dist",',
      "});",
      "",
    ].join("\n"),
  );

  await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib outDir must not escape the project root through a symbolic link");
});

test("loadConfig rejects config helper imports outside the project root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-parent-helper-"));
  createdDirs.push(appRoot);

  const outsideHelperPath = join(process.cwd(), ".tmp-solid-config-parent-helper.ts");

  writeFileSync(outsideHelperPath, 'export const title = "Parent helper";\n');

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "src", "_.tsx"),
      [
        "export default () => {",
        "  return <main>Parent helper</main>;",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        'import { title } from "../.tmp-solid-config-parent-helper";',
        "",
        "export default defineConfig({",
        "  appTitle: title,",
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib config imports must stay inside the project root");
  } finally {
    rmSync(outsideHelperPath, { force: true });
  }
});

test("loadConfig rejects config helper symlinks whose real target escapes the project root", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-symlink-helper-"));
  createdDirs.push(appRoot);

  const outsideHelperPath = join(process.cwd(), ".tmp-solid-config-external-symlink-helper.ts");

  writeFileSync(outsideHelperPath, 'export const title = "Symlink helper";\n');

  try {
    mkdirSync(join(appRoot, "src"), { recursive: true });
    symlinkSync(outsideHelperPath, join(appRoot, "helper.ts"));

    writeFileSync(
      join(appRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
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
        },
        null,
        2,
      )}\n`,
    );

    writeFileSync(
      join(appRoot, "src", "_.tsx"),
      [
        "export default () => {",
        "  return <main>Symlink helper</main>;",
        "}",
        "",
      ].join("\n"),
    );

    writeFileSync(
      join(appRoot, "config.ts"),
      [
        'import { defineConfig } from "solid-lib/builder";',
        'import { title } from "./helper";',
        "",
        "export default defineConfig({",
        "  appTitle: title,",
        "});",
        "",
      ].join("\n"),
    );

    await expect(loadConfig(appRoot)).rejects.toThrow("solid-lib config imports must stay inside the project root");
  } finally {
    rmSync(outsideHelperPath, { force: true });
  }
});

test("loadConfig works when the project root is read-only", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-config-readonly-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      "  return <main>Readonly config</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  appTitle: "Readonly config",',
      "});",
      "",
    ].join("\n"),
  );

  chmodSync(appRoot, 0o555);

  try {
    const loaded = await loadConfig(appRoot);
    expect(loaded.config.appTitle).toBe("Readonly config");
  } finally {
    chmodSync(appRoot, 0o755);
  }
});

test("loadConfig works when the project path contains percent-encoded characters", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid%41config-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      "  return <main>Encoded path config</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  appTitle: "Encoded path config",',
      "});",
      "",
    ].join("\n"),
  );

  const loaded = await loadConfig(appRoot);
  expect(loaded.config.appTitle).toBe("Encoded path config");
});

test("solid-lib dev works when the project root is read-only", async () => {
  const appRoot = mkdtempSync(join(process.cwd(), ".tmp-solid-lib-dev-readonly-"));
  createdDirs.push(appRoot);

  mkdirSync(join(appRoot, "src"), { recursive: true });

  writeFileSync(
    join(appRoot, "tsconfig.json"),
    `${JSON.stringify(
      {
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
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(appRoot, "src", "_.tsx"),
    [
      "export default () => {",
      "  return <main>Readonly dev root</main>;",
      "}",
      "",
    ].join("\n"),
  );

  writeFileSync(
    join(appRoot, "config.ts"),
    [
      'import { defineConfig } from "solid-lib/builder";',
      "",
      "export default defineConfig({",
      '  appTitle: "Readonly dev root",',
      "});",
      "",
    ].join("\n"),
  );

  chmodSync(appRoot, 0o555);

  try {
    const loaded = await loadConfig(appRoot);
    const devServer = await startDevServer(loaded, { host: "127.0.0.1", port: 0 });
    stopFns.push(() => devServer.stop());

    const html = await (await fetch(`${devServer.origin}/`)).text();
    expect(html).toContain("<title>Readonly dev root</title>");
  } finally {
    chmodSync(appRoot, 0o755);
  }
});

const readReloadEvent = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const timeoutAt = Date.now() + 10000;
  let received = "";

  while (Date.now() < timeoutAt) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    received += decoder.decode(value, { stream: true });
    if (received.includes("event: reload")) {
      return received;
    }
  }

  throw new Error(`Expected reload event, received: ${received}`);
}
