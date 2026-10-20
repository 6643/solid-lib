import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SOLID_RC = "2.0.0-rc.15";

const readJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(await readText(join(import.meta.dirname, "..", relativePath))) as T;

test("solid-lib groups runtime, dev, and peer dependencies intentionally", async () => {
  const packageJson = await readJson<{
    bin?: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    exports: Record<string, unknown>;
    peerDependencies: Record<string, string>;
    scripts?: Record<string, string>;
  }>("package.json");

  expect(packageJson.bin).toBeUndefined();
  expect(Object.keys(packageJson.exports).sort()).toEqual([".", "./ui.css"]);
  expect(packageJson.exports["."]).toEqual({
    types: "./src/_.ts",
    import: "./src/_.ts",
  });
  expect(packageJson.exports["./ui.css"]).toBe("./src/_.css");

  expect(packageJson.dependencies["@solidjs/web"]).toBe(SOLID_RC);
  expect(packageJson.devDependencies["@types/bun"]).toBeUndefined();
  expect(packageJson.devDependencies["@types/node"]).toBeDefined();
  expect(packageJson.devDependencies["solid-js"]).toBe(SOLID_RC);
  expect(packageJson.devDependencies["typescript"]).toBe("7.0.2");
  expect(packageJson.peerDependencies["solid-js"]).toBe(SOLID_RC);
  expect(packageJson.dependencies["solid-js"]).toBeUndefined();
  expect(packageJson.dependencies["@babel/core"]).toBeUndefined();
  expect(packageJson.dependencies["babel-preset-solid"]).toBeUndefined();
  expect(packageJson.dependencies["@solidjs/start"]).toBeUndefined();
  expect(packageJson.devDependencies["@types/babel__core"]).toBeUndefined();
  expect(packageJson.scripts?.postinstall).toBeUndefined();

  expect(packageJson.peerDependencies["@types/bun"]).toBeUndefined();

  expect([
    ...Object.values(packageJson.dependencies),
    ...Object.values(packageJson.devDependencies),
    ...Object.values(packageJson.peerDependencies),
  ]).not.toContain("latest");
  expect([
    ...Object.values(packageJson.dependencies),
    ...Object.values(packageJson.devDependencies),
    ...Object.values(packageJson.peerDependencies),
  ]).not.toContain("latest");
});

test("demo uses the official Solid 2 Vite toolchain", async () => {
  const demoPackageJson = await readJson<{
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  }>("demo/package.json");

  expect(demoPackageJson.dependencies["@solidjs/web"]).toBe(SOLID_RC);
  // Vite+ 迁移后：demo 脚本由 vp 驱动，vite 通过 vite-plus-core 别名提供
  expect(demoPackageJson.scripts).toMatchObject({
    build: "vp build",
    dev: "vp dev",
    preview: "vp preview",
  });
  expect(demoPackageJson.devDependencies["@solidjs/compiler"]).toBe(SOLID_RC);
  expect(demoPackageJson.devDependencies["@solidjs/router"]).toBe("2.0.0-next.40");
  expect(demoPackageJson.devDependencies["@solidjs/vite-plugin"]).toBe("3.0.0-next.50");
  expect(demoPackageJson.devDependencies["solid-js"]).toBe(SOLID_RC);
  expect(demoPackageJson.devDependencies["solid-lib"]).toBeUndefined();
  expect(demoPackageJson.devDependencies.typescript).toBe("7.0.2");
  expect(demoPackageJson.devDependencies.vite).toBe("npm:@voidzero-dev/vite-plus-core@1.3.0");
  expect(demoPackageJson.devDependencies["vite-plus"]).toBe("1.3.0");
});

test("project declares pnpm as its package manager", async () => {
  const packageJson = await readJson<{
    devEngines?: { packageManager?: { name?: string } };
  }>("package.json");
  const repoRoot = join(import.meta.dirname, "..");

  const demoPackageJson = await readJson<{
    devEngines?: { packageManager?: { name?: string } };
  }>("demo/package.json");

  expect(packageJson.devEngines?.packageManager?.name).toBe("pnpm");
  expect(demoPackageJson.devEngines?.packageManager?.name).toBe("pnpm");
  expect(existsSync(join(repoRoot, "pnpm-lock.yaml"))).toBe(true);
  expect(existsSync(join(repoRoot, "nub.lock"))).toBe(false);
  expect(existsSync(join(repoRoot, "bun.lock"))).toBe(false);
});

test("root README documents the unified library entry", async () => {
  const readme = await readText(join(import.meta.dirname, "..", "README.md"));

  expect(readme).toContain("组件、hooks 与工具统一从 `solid-lib` 根入口导入");
  expect(readme).not.toContain("solid-lib/ui` 导入");
  expect(readme).not.toContain("solid-lib/utils` 导入");
});
