import { expect, test } from "bun:test";
import { join } from "node:path";

const SOLID_BETA = "2.0.0-beta.15";

const readJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(await Bun.file(join(import.meta.dir, "..", relativePath)).text()) as T;

test("solid-lib groups runtime, dev, and peer dependencies intentionally", async () => {
  const packageJson = await readJson<{
    bin: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    exports: {
      ".": undefined;
      "./builder": {
        import: string;
        types: string;
      };
      "./route": {
        import: string;
        types: string;
      };
      "./ui": {
        import: string;
        types: string;
      };
      "./utils": {
        import: string;
        types: string;
      };
      "./ui.css": string;
    };
    peerDependencies: Record<string, string>;
  }>("package.json");

  expect(packageJson.bin).toEqual({ "solid-lib": "./src/builder/cli.ts" });
  expect(packageJson.exports["."]).toBeUndefined();
  expect(packageJson.exports["./builder"].import).toBe("./src/builder/_.ts");
  expect(packageJson.exports["./builder"].types).toBe("./src/builder/_.ts");
  expect(packageJson.exports["./route"].import).toBe("./src/route/_.ts");
  expect(packageJson.exports["./route"].types).toBe("./src/route/_.ts");
  expect(packageJson.exports["./ui"].import).toBe("./src/ui/_.ts");
  expect(packageJson.exports["./ui"].types).toBe("./src/ui/_.ts");
  expect(packageJson.exports["./utils"].import).toBe("./src/utils/_.ts");
  expect(packageJson.exports["./utils"].types).toBe("./src/utils/_.ts");
  expect(packageJson.exports["./ui.css"]).toBe("./src/ui/_.css");

  expect(packageJson.dependencies["@babel/core"]).toBe("7.29.0");
  expect(packageJson.dependencies["@solidjs/web"]).toBe(SOLID_BETA);
  expect(packageJson.dependencies["babel-preset-solid"]).toBe(SOLID_BETA);
  expect(packageJson.dependencies["typescript"]).toBe("6.0.3");
  expect(packageJson.devDependencies["@types/babel__core"]).toBe("7.20.5");
  expect(packageJson.devDependencies["@types/bun"]).toBe("1.3.14");
  expect(packageJson.devDependencies["solid-js"]).toBe(SOLID_BETA);
  expect(packageJson.peerDependencies["solid-js"]).toBe(SOLID_BETA);
  expect(packageJson.dependencies["solid-js"]).toBeUndefined();

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
  ]).not.toContain("next");
});

test("demo keeps local build dependencies in devDependencies", async () => {
  const demoPackageJson = await readJson<{
    dependencies?: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  }>("demo/package.json");

  expect(demoPackageJson.dependencies).toBeUndefined();
  expect(demoPackageJson.scripts.build).toBe("solid-lib build");
  expect(demoPackageJson.scripts.dev).toBe("solid-lib dev");
  expect(demoPackageJson.devDependencies["solid-js"]).toBe(SOLID_BETA);
  expect(demoPackageJson.devDependencies["solid-lib"]).toBe("link:solid-lib");
});

test("root README matches the exported subproject count", async () => {
  const readme = await Bun.file(join(import.meta.dir, "..", "README.md")).text();

  expect(readme).toContain("`solid-lib` 当前包含四个核心子项目:");
  expect(readme).not.toContain("`solid-lib` 当前包含三个核心子项目:");
  expect(readme).toContain("utils 只能从 `solid-lib/utils` 导入");
});
