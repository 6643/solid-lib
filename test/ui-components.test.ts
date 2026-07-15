import { expect, test } from "bun:test";
import { join } from "node:path";

test("ui exports the public component primitives", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "src", "ui", "_.ts")).text();

  expect(source).toContain('export { Card, type CardProps } from "./Card";');
  expect(source).toContain("type ButtonTapHandler");
  expect(source).not.toContain("./buttonCore");
  expect(source).toContain('export { initTheme, useTheme, initAccent, useAccent } from "./Theme";');
  expect(source).toContain('export { createStorage } from "../utils/createStorage";');
  expect(source).toContain('export { useMediaQuery } from "../utils/useMediaQuery";');
  expect(source).toContain('export { loadScript } from "../utils/loadScript";');
  expect(source).toContain('export { loadStyle } from "../utils/loadStyle";');
  expect(source).not.toContain('export { useMediaQuery } from "./useMediaQuery";');
  expect(source).not.toContain('export { loadScript } from "./loadScript";');
  expect(source).not.toContain('export { loadStyle } from "./loadStyle";');
});

test("generic helpers live under src/utils instead of src/ui", async () => {
  const [buttonSource, loadMoreSource, themeSource, swiperSource, plyrSource, utilsSource] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src", "ui", "Button.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src", "ui", "LoadMore.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src", "ui", "Theme.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src", "ui", "Swiper.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src", "ui", "Plyr.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src", "utils", "_.ts")).text(),
  ]);

  expect(await Bun.file(join(import.meta.dir, "..", "src", "utils", "loadScript.ts")).exists()).toBe(true);
  expect(await Bun.file(join(import.meta.dir, "..", "src", "utils", "loadStyle.ts")).exists()).toBe(true);
  expect(await Bun.file(join(import.meta.dir, "..", "src", "utils", "useMediaQuery.ts")).exists()).toBe(true);
  expect(await Bun.file(join(import.meta.dir, "..", "src", "ui", "loadScript.ts")).exists()).toBe(false);
  expect(await Bun.file(join(import.meta.dir, "..", "src", "ui", "loadStyle.ts")).exists()).toBe(false);
  expect(await Bun.file(join(import.meta.dir, "..", "src", "ui", "useMediaQuery.ts")).exists()).toBe(false);
  expect(await Bun.file(join(import.meta.dir, "..", "src", "ui", "buttonCore.ts")).exists()).toBe(false);

  expect(buttonSource).not.toContain('from "./buttonCore"');
  expect(loadMoreSource).toContain('from "../utils/useLoad"');
  expect(loadMoreSource).not.toContain('from "../utils/useScrollEnd');
  expect(loadMoreSource).not.toContain("createSignal");
  expect(loadMoreSource).not.toContain("getToVisBottom");
  expect(themeSource).toContain('from "../utils/createStorage"');
  expect(themeSource).toContain('from "./themeMode"');
  expect(themeSource).toContain("let accentState");
  expect(swiperSource).toContain('from "../utils/loadScript"');
  expect(plyrSource).toContain('from "../utils/loadScript"');
  expect(plyrSource).toContain('from "../utils/loadStyle"');
  expect(utilsSource).toContain('export { useMediaQuery } from "./useMediaQuery";');
  expect(utilsSource).toContain('export { loadScript } from "./loadScript";');
  expect(utilsSource).toContain('export { loadStyle } from "./loadStyle";');
});

test("ui and utils use Solid 2.0 lifecycle primitives instead of createTrackedEffect", async () => {
  const paths = [
    "src/ui/BottomTab.tsx",
    "src/ui/CountDown.tsx",
    "src/ui/LeftTab.tsx",
    "src/ui/LoadMore.tsx",
    "src/ui/MenuTab.tsx",
    "src/ui/NavTab.tsx",
    "src/ui/SortListBox.tsx",
    "src/ui/TopTab.tsx",
    "src/ui/Modal.tsx",
    "src/utils/createFullscreen.ts",
    "src/utils/useClass.ts",
    "src/utils/useKeepScroll.ts",
    "src/route/Route.tsx",
  ];
  const sources = await Promise.all(paths.map((path) => Bun.file(join(import.meta.dir, "..", path)).text()));

  for (const source of sources) {
    expect(source).not.toContain("createTrackedEffect");
  }

  // Component-level one-shot setup/teardown uses onSettled (Tabs restore index via createSignal init).
  for (const path of [
    "src/ui/CountDown.tsx",
    "src/ui/MenuTab.tsx",
    "src/ui/NavTab.tsx",
    "src/ui/SortListBox.tsx",
    "src/utils/createFullscreen.ts",
    "src/route/Route.tsx",
  ]) {
    const source = await Bun.file(join(import.meta.dir, "..", path)).text();
    expect(source).toContain("onSettled");
  }

  // Simple tabs restore index from store at signal init; no no-op onSettled(toIndex(getPos)).
  for (const path of ["src/ui/BottomTab.tsx", "src/ui/LeftTab.tsx", "src/ui/TopTab.tsx"]) {
    const source = await Bun.file(join(import.meta.dir, "..", path)).text();
    expect(source).not.toContain("onSettled");
    expect(source).toContain("getPos(location.pathname");
  }

  // Reactive side effects use createEffect(compute, apply).
  for (const path of ["src/ui/Modal.tsx", "src/utils/useClass.ts", "src/utils/useKeepScroll.ts"]) {
    const source = await Bun.file(join(import.meta.dir, "..", path)).text();
    expect(source).toContain("createEffect");
  }
});

test("src packages use Solid 2.0 APIs and never 1.x-removed or app-forbidden primitives", async () => {
  const { readdir } = await import("node:fs/promises");
  const packages = ["builder", "route", "ui", "utils"] as const;
  // App-level forbidden names (still may exist in solid-js for internals).
  const bannedTokens = [
    "onCleanup",
    "onMount",
    "createTrackedEffect",
    "createRenderEffect",
    "createResource",
    "createComputed",
    "createMutable",
    "mergeProps",
    "splitProps",
    "createSelector",
    "createDeferred",
    "startTransition",
    "useTransition",
    "ErrorBoundary",
    "SuspenseList",
    "catchError",
    "classList=",
  ] as const;
  // 1.x solid helpers that must not be imported from solid-js.
  const bannedSolidImports = new Set([
    "onCleanup",
    "onMount",
    "createTrackedEffect",
    "createRenderEffect",
    "createResource",
    "createComputed",
    "batch",
    "produce",
    "Index",
    "Suspense",
    "mergeProps",
    "splitProps",
    "on",
    "from",
    "observable",
  ]);

  const files: string[] = [];
  for (const pkg of packages) {
    const dir = join(import.meta.dir, "..", "src", pkg);
    const walk = async (current: string) => {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const full = join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (entry.name === "svgicons.ts") continue;
        files.push(full);
      }
    };
    await walk(dir);
  }

  expect(files.length).toBeGreaterThan(40);

  let createEffectCount = 0;
  let onSettledCount = 0;

  for (const file of files) {
    const source = await Bun.file(file).text();
    const rel = file.slice(file.indexOf("/src/") + 1);

    for (const token of bannedTokens) {
      expect(source, `${rel} must not use ${token}`).not.toContain(token);
    }

    // Removed package paths (allow prose comments that only mention the migration).
    expect(source).not.toMatch(/from\s+["']solid-js\/(?:web|store|jsx-runtime|h|html|universal)["']/);
    expect(source).not.toMatch(/["']solid-js\/web["']/);
    expect(source).not.toMatch(/["']solid-js\/store["']/);

    // Collect identifiers imported from solid-js / @solidjs/*.
    for (const importMatch of source.matchAll(/import\s+(type\s+)?\{([^}]+)\}\s+from\s+["'](solid-js|@solidjs\/[^"']+)["']/g)) {
      const names = importMatch[2]!
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part.replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim());
      for (const name of names) {
        expect(bannedSolidImports.has(name), `${rel} imports forbidden solid API: ${name}`).toBe(false);
      }
    }

    // createEffect must be dual-arg when present (single-arg form is removed in 2.0).
    const effectMatches = source.matchAll(/\bcreateEffect\s*\(/g);
    for (const match of effectMatches) {
      createEffectCount += 1;
      const start = match.index! + match[0].length;
      let depth = 1;
      let i = start;
      let topCommas = 0;
      let inString: string | null = null;
      while (i < source.length && depth > 0) {
        const c = source[i]!;
        if (inString) {
          if (c === "\\") {
            i += 2;
            continue;
          }
          if (c === inString) inString = null;
          i += 1;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") {
          inString = c;
        } else if (c === "(") depth += 1;
        else if (c === ")") depth -= 1;
        else if (c === "," && depth === 1) topCommas += 1;
        i += 1;
      }
      expect(topCommas, `${rel} createEffect must have >=2 args`).toBeGreaterThanOrEqual(1);
    }

    if (/\bonSettled\s*\(/.test(source)) onSettledCount += 1;
  }

  expect(createEffectCount).toBeGreaterThan(20);
  expect(onSettledCount).toBeGreaterThan(5);
});

test("Button source converts numeric dimensions into css sizes", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "src", "ui", "Button.tsx")).text();

  expect(source).toContain("const createButtonStyle");
  expect(source).toContain('typeof value === "number" ? `${value}px` : value');
  expect(source).toContain('style["--radius"] = borderRadius');
  expect(source).toContain('style["--height"] = height');
  expect(source).toContain('style["--width"] = width');
});

test("Button source keeps tap invocation async-safe", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "src", "ui", "Button.tsx")).text();

  expect(source).toContain("export type ButtonTapHandler = () => void | Promise<void>;");
  expect(source).toContain("const isPromiseLike");
  expect(source).toContain("const invokeButtonTap");
  expect(source).toContain("await result");
  expect(source).toContain("await invokeButtonTap(props.tap)");
});

test("SvgIcon source renders the provided svg string through innerHTML", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "src/ui/SvgIcon.tsx")).text();

  expect(source).toContain("innerHTML={props.name}");
});

test("SvgIcon component source stays separate from the generated icon catalog", async () => {
  const [componentSource, iconSource] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src/ui/SvgIcon.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/svgicons.ts")).text(),
  ]);

  expect(componentSource).not.toContain("export const icon_zoom_out_map");
  expect(componentSource.split("\n").length).toBeLessThan(80);
  expect(iconSource).toContain("export const icon_10k");
  expect(iconSource).toContain("export const icon_zoom_out_map");
});

test("ui component css modules map to the public theme tokens", async () => {
  const [buttonCss, cardCss, inputCss] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src/ui/Button.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/Card.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/Input.module.css")).text(),
  ]);

  expect(buttonCss).toContain("var(--accent-color)");
  expect(buttonCss).not.toContain("--pf-color");
  expect(buttonCss).not.toContain("--sf-color");
  expect(buttonCss).not.toContain("--sb-color");

  expect(cardCss).toContain("var(--raised-bg)");
  expect(cardCss).toContain("var(--raised-fg)");

  expect(inputCss).toContain("var(--base-bg)");
  expect(inputCss).toContain("var(--sunken-fg)");
  expect(inputCss).toContain("var(--disabled-color)");
});

test("button and input css keep neutral defaults and state colors separated", async () => {
  const [buttonCss, inputCss, cardCss, topTabCss, navTabCss, menuTabCss, cityPickerCss, expandCss, timelineCss] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src/ui/Button.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/Input.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/Card.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/TopTab.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/NavTab.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/MenuTab.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/CityPicker.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/Expand.module.css")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/TimeLine.module.css")).text(),
  ]);

  expect(buttonCss).toContain("border: 2px solid var(--color, var(--accent-color))");

  expect(buttonCss).toContain("background-image: radial-gradient(");
  expect(inputCss).toContain("color-mix(");
  expect(cardCss).not.toContain("color-mix(");
  expect(topTabCss).not.toContain("color-mix(");
  expect(navTabCss).not.toContain("color-mix(");
  expect(menuTabCss).not.toContain("color-mix(");

  expect(cityPickerCss).not.toContain("white");
  expect(expandCss).not.toContain("white");
  expect(cardCss).not.toContain("rgba(");
  expect(topTabCss).not.toContain("rgba(");
  expect(menuTabCss).not.toContain("rgba(");
  expect(inputCss).toContain("rgba(");
  expect(timelineCss).not.toContain("antiquewhite");
});

test("button ripple css uses the existing radial overlay implementation", async () => {
  const buttonCss = await Bun.file(join(import.meta.dir, "..", "src/ui/Button.module.css")).text();

  expect(buttonCss).toContain("background-image: radial-gradient(");
  expect(buttonCss).toContain("background-size: 1000% 1000%");
  expect(buttonCss).toContain("background-size: 0 0");
  expect(buttonCss).not.toContain("scale(0)");
});

test("ui public surface keeps CityPicker and Carousel as real components", async () => {
  const [barrel, cityPicker, carousel] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src/ui/_.ts")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/CityPicker.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/Carousel.tsx")).text(),
  ]);

  expect(barrel).toContain('export { Carousel } from "./Carousel"');
  expect(barrel).toContain('export { CityPicker, initCities } from "./CityPicker"');

  // CityPicker must render the picker shell, not only pass-through children.
  expect(cityPicker).toContain("styles.CityPicker");
  expect(cityPicker).toContain("getCities");
  expect(cityPicker).toContain("banCodes");
  expect(cityPicker).not.toMatch(/return\s+<>\s*\{props\.children\}\s*<\/>/);

  // Carousel must track an active index and translate (not a static gallery stub).
  expect(carousel).toContain("createSignal");
  expect(carousel).toMatch(/translateX|setIndex|getIndex/);
  expect(carousel).not.toContain("For full functionality");
});
