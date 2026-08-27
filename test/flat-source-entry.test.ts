import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

test("solid-lib exposes the flat source entry for UI and utility APIs", async () => {
    const repoRoot = join(import.meta.dir, "..");
    const packageJson = JSON.parse(await Bun.file(join(repoRoot, "package.json")).text()) as {
        exports: Record<string, unknown>;
    };

    expect(packageJson.exports["."]).toEqual({
        types: "./src/_.ts",
        import: "./src/_.ts",
    });
    expect(packageJson.exports["./ui.css"]).toBe("./src/_.css");
    expect(packageJson.exports["./ui"]).toBeUndefined();
    expect(packageJson.exports["./utils"]).toBeUndefined();

    expect(existsSync(join(repoRoot, "src", "builder"))).toBe(false);
    expect(existsSync(join(repoRoot, "src", "route"))).toBe(false);
    expect(existsSync(join(repoRoot, "src", "solid-js-compat.d.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "demo", "solid-js-compat.d.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "scripts", "patch-solid-jsx-runtime.mjs"))).toBe(false);
    expect(existsSync(join(repoRoot, "scripts", "solid-jsx-runtime-shim.js"))).toBe(false);

    const tsconfig = await Bun.file(join(repoRoot, "tsconfig.json")).text();
    expect(tsconfig).toContain('"src/_.css"');
    expect(tsconfig).not.toContain('"src/ui/_.css"');

    const source = await Bun.file(join(repoRoot, "src", "_.ts")).text();

    expect(source).toContain("export { Card");
    expect(source).toContain("export { createStorage");
    expect(source).toContain("export { useVis }");
});
