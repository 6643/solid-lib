import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// The library ships raw TypeScript sources that import siblings without an
// extension, the way bundlers resolve them. Node's ESM loader requires the
// extension, so the test runtime registers this narrow resolver instead of
// rewriting the published source style.
//
// TODO: delete this hook once src/ imports carry explicit extensions; the
// source style is the only reason Node needs it.
const EXTENSIONS = [".ts", ".tsx"];
const HAS_EXTENSION = /\.[cm]?[jt]sx?$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parentUrl = context.parentURL;
    if (parentUrl === undefined || !specifier.startsWith(".") || HAS_EXTENSION.test(specifier)) {
      return nextResolve(specifier, context);
    }

    const resolved = EXTENSIONS.map((extension) => specifier + extension).find((candidate) =>
      existsSync(fileURLToPath(new URL(candidate, parentUrl))),
    );

    return nextResolve(resolved ?? specifier, context);
  },
});
