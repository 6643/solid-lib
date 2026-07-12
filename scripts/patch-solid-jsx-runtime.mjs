import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = join(root, "node_modules", "@solidjs", "web");
const pkgPath = join(webRoot, "package.json");
const shimSrc = join(root, "scripts", "solid-jsx-runtime-shim.js");
const shimDest = join(webRoot, "jsx-runtime-shim.js");

if (!existsSync(pkgPath) || !existsSync(shimSrc)) {
  process.exit(0);
}

copyFileSync(shimSrc, shimDest);

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const target = {
  import: { types: "./types/jsx.d.ts", default: "./jsx-runtime-shim.js" },
  require: { types: "./types-cjs/jsx.d.cts", default: "./jsx-runtime-shim.js" },
};
pkg.exports = pkg.exports ?? {};
pkg.exports["./jsx-runtime"] = target;
pkg.exports["./jsx-dev-runtime"] = target;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("patched @solidjs/web jsx runtime for Bun automatic JSX");
