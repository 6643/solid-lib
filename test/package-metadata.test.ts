import { expect, test } from "bun:test";
import { join } from "node:path";

const readJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(await Bun.file(join(import.meta.dir, "..", relativePath)).text()) as T;

test("solid-lib groups runtime, dev, and peer dependencies intentionally", async () => {
  const packageJson = await readJson<{
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
      "./ui.css": string;
    };
    peerDependencies: Record<string, string>;
  }>("package.json");

  expect(packageJson.exports["."]).toBeUndefined();
  expect(packageJson.exports["./builder"].import).toBe("./src/builder/_.ts");
  expect(packageJson.exports["./builder"].types).toBe("./src/builder/_.ts");
  expect(packageJson.exports["./route"].import).toBe("./src/route/_.ts");
  expect(packageJson.exports["./route"].types).toBe("./src/route/_.ts");
  expect(packageJson.exports["./ui"].import).toBe("./src/ui/_.ts");
  expect(packageJson.exports["./ui"].types).toBe("./src/ui/_.ts");
  expect(packageJson.exports["./ui.css"]).toBe("./src/ui/_.css");

  expect(packageJson.dependencies["babel-preset-solid"]).toBe("next");
  expect(packageJson.devDependencies["solid-js"]).toBe("next");
  expect(packageJson.peerDependencies["solid-js"]).toBe("next");
  expect(packageJson.dependencies["solid-js"]).toBeUndefined();

  expect(packageJson.dependencies["@babel/core"]).toBe("latest");
  expect(packageJson.dependencies["@babel/preset-typescript"]).toBe("latest");
  expect(packageJson.dependencies["dom-expressions"]).toBe("latest");
  expect(packageJson.dependencies["typescript"]).toBe("latest");
  expect(packageJson.devDependencies["@types/babel__core"]).toBe("latest");
  expect(packageJson.devDependencies["@types/bun"]).toBe("latest");
  expect(packageJson.peerDependencies["@types/bun"]).toBeUndefined();
});

test("demo keeps local build dependencies in devDependencies", async () => {
  const demoPackageJson = await readJson<{
    dependencies?: Record<string, string>;
    devDependencies: Record<string, string>;
  }>("demo/package.json");

  expect(demoPackageJson.dependencies).toBeUndefined();
  expect(demoPackageJson.devDependencies["solid-js"]).toBe("next");
  expect(demoPackageJson.devDependencies["solid-lib"]).toBe("link:solid-lib");
});
