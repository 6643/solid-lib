# UI Theme System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `solid-lib/ui` theme module with root-level mode switching, CSS theme variables, local preference persistence, and a small demo/smoke path that proves the API and CSS work in both linked and packed consumers.

**Architecture:** Keep responsibility split cleanly. `src/ui/theme.ts` owns runtime mode behavior on `html[data-theme-mode]`; `src/ui/_.css` owns all color values and CSS variable mapping; components and demos only consume variables. Preserve the existing tiny API surface where practical by making `setLightTheme` and `setDarkTheme` wrappers over the new mode API.

**Tech Stack:** Bun tests, TypeScript, CSS, Solid demo app, package subpath exports

---

## File Structure

- Modify: `package.json`
  Add public `./ui` and `./ui.css` exports so consumers can import the runtime API and the CSS contract.

- Modify: `README.md`
  Document the new `solid-lib/ui` and `solid-lib/ui.css` import paths alongside the existing `builder` and `route` entries.

- Create: `src/ui/README.md`
  Explain the UI theme module contract, the root mode attribute, and the exported CSS variable groups.

- Modify: `src/ui/_.ts`
  Export the public UI runtime API from `src/ui/theme.ts`.

- Modify: `src/ui/theme.ts`
  Replace class toggling with `data-theme-mode` management, localStorage persistence, and root attribute helpers while keeping light/dark wrappers as compatibility shims.

- Create: `src/ui/_.css`
  Define the light/dark/system theme variable matrix:
  `base`, `raised`, `inset`, `disabled`, `theme-color`, `error-color`.

- Modify: `test/theme.test.ts`
  Replace class-list assertions with root attribute and storage assertions for the new API.

- Modify: `test/package-metadata.test.ts`
  Assert `./ui` and `./ui.css` are exported intentionally.

- Create: `test/ui-theme-css.test.ts`
  Assert the CSS contract exists and includes the required selectors and variables.

- Modify: `test/demo-local-consumer.ts`
  Exercise the new public UI exports by importing `solid-lib/ui` and `solid-lib/ui.css` in both local and packed consumer builds.

- Modify: `demo/global.d.ts`
  Allow side-effect imports of plain `.css` files in the demo.

- Modify: `demo/src/_.tsx`
  Import `solid-lib/ui.css` and swap the demo root to a focused theme playground during validation.

- Create: `demo/src/ThemePlayground.tsx`
  Render a minimal light/dark/system mode switcher and a handful of surfaces/buttons that consume the theme variables.

- Create: `demo/src/ThemePlayground.module.css`
  Style the playground using only the new public CSS variables.

## Task 1: Publish the `ui` Surface

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `src/ui/README.md`
- Modify: `src/ui/_.ts`
- Modify: `test/package-metadata.test.ts`

- [ ] **Step 1: Write the failing export contract test**

```ts
expect(packageJson.exports["./ui"].import).toBe("./src/ui/_.ts");
expect(packageJson.exports["./ui"].types).toBe("./src/ui/_.ts");
expect(packageJson.exports["./ui.css"]).toBe("./src/ui/_.css");
```

- [ ] **Step 2: Run the package metadata test to verify it fails**

Run: `bun test test/package-metadata.test.ts`
Expected: FAIL because `./ui` and `./ui.css` are not in `package.json`.

- [ ] **Step 3: Add the public export entries and seed the public docs**

`package.json`:

```json
"exports": {
  "./builder": {
    "types": "./src/builder/_.ts",
    "import": "./src/builder/_.ts"
  },
  "./route": {
    "types": "./src/route/_.ts",
    "import": "./src/route/_.ts"
  },
  "./ui": {
    "types": "./src/ui/_.ts",
    "import": "./src/ui/_.ts"
  },
  "./ui.css": "./src/ui/_.css"
}
```

`src/ui/_.ts`:

```ts
export type { ThemeMode } from "./theme";
export {
  getThemeMode,
  initializeThemeMode,
  setThemeMode,
  setSystemTheme,
  setLightTheme,
  setDarkTheme,
} from "./theme";
```

`README.md`:

```md
- [ui](./src/ui/README.md)
  面向亮暗模式与主题变量的最小 UI 主题能力

- ui 只能从 `solid-lib/ui` 导入
- 样式只能从 `solid-lib/ui.css` 导入
```

- [ ] **Step 4: Run the package metadata test again**

Run: `bun test test/package-metadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json README.md src/ui/README.md src/ui/_.ts test/package-metadata.test.ts
git commit -m "feat: publish ui package surface"
```

## Task 2: Replace Class Toggling with Root Theme Mode API

**Files:**
- Modify: `src/ui/theme.ts`
- Modify: `src/ui/_.ts`
- Modify: `test/theme.test.ts`

- [ ] **Step 1: Write the failing runtime tests for mode attributes and storage**

Add tests like:

```ts
test("setThemeMode writes data-theme-mode to the root element", () => {
  const documentElement = installDocumentElement();

  setThemeMode("dark");

  expect(documentElement.getAttribute("data-theme-mode")).toBe("dark");
});

test("initializeThemeMode falls back to system when storage is empty", () => {
  const documentElement = installDocumentElement();

  const mode = initializeThemeMode();

  expect(mode).toBe("system");
  expect(documentElement.getAttribute("data-theme-mode")).toBe("system");
});
```

- [ ] **Step 2: Run the targeted theme tests to verify they fail**

Run: `bun test test/theme.test.ts`
Expected: FAIL because `setThemeMode` and `initializeThemeMode` do not exist and the code still toggles classes.

- [ ] **Step 3: Implement the minimal root-mode API**

`src/ui/theme.ts` should converge on this shape:

```ts
export type ThemeMode = "system" | "light" | "dark";

const THEME_MODE_ATTRIBUTE = "data-theme-mode";
const THEME_MODE_STORAGE_KEY = "solid-lib:theme-mode";

export const getThemeMode = (): ThemeMode => readThemeModeFromRoot() ?? "system";

export const setThemeMode = (mode: ThemeMode) => {
  writeThemeModeToRoot(mode);
  writeThemeModeToStorage(mode);
};

export const initializeThemeMode = (): ThemeMode => {
  const mode = readThemeModeFromStorage() ?? "system";
  writeThemeModeToRoot(mode);
  return mode;
};

export const setSystemTheme = () => {
  setThemeMode("system");
};

export const setLightTheme = () => {
  setThemeMode("light");
};

export const setDarkTheme = () => {
  setThemeMode("dark");
};
```

Test helpers should fake:
- `document.documentElement.getAttribute`
- `document.documentElement.setAttribute`
- `globalThis.localStorage`

- [ ] **Step 4: Run the theme tests again**

Run: `bun test test/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.ts src/ui/_.ts test/theme.test.ts
git commit -m "feat: add root theme mode api"
```

## Task 3: Add the Public CSS Theme Contract

**Files:**
- Create: `src/ui/_.css`
- Create: `test/ui-theme-css.test.ts`

- [ ] **Step 1: Write the failing CSS contract test**

Create a file-text assertion like:

```ts
const css = await Bun.file(join(import.meta.dir, "..", "src/ui/_.css")).text();

expect(css).toContain("--base-bg");
expect(css).toContain("--raised-bg");
expect(css).toContain("--inset-bg");
expect(css).toContain("--disabled-bg");
expect(css).toContain("--theme-color");
expect(css).toContain("--error-color");
expect(css).toContain('html[data-theme-mode="light"]');
expect(css).toContain('html[data-theme-mode="dark"]');
expect(css).toContain('html[data-theme-mode="system"]');
```

- [ ] **Step 2: Run the CSS contract test to verify it fails**

Run: `bun test test/ui-theme-css.test.ts`
Expected: FAIL because `src/ui/_.css` does not exist yet.

- [ ] **Step 3: Implement the CSS variable matrix**

Seed `src/ui/_.css` with this structure:

```css
html {
  color: var(--base-fg);
  background: var(--base-bg);
}

html[data-theme-mode="light"] {
  --base-bg: #f2ebdf;
  --base-fg: #2a241d;
  --raised-bg: #fbf6ee;
  --raised-fg: #2a241d;
  --inset-bg: #e5dbcb;
  --inset-fg: #241e18;
  --disabled-bg: #e1d8cc;
  --disabled-fg: #948675;
  --theme-color: #0f8077;
  --error-color: #b33330;
}

html[data-theme-mode="dark"] {
  --base-bg: #171412;
  --base-fg: #ebe3d8;
  --raised-bg: #211d19;
  --raised-fg: #efe7dd;
  --inset-bg: #100e0d;
  --inset-fg: #d8cfc4;
  --disabled-bg: #292521;
  --disabled-fg: #847970;
  --theme-color: #1fa89b;
  --error-color: #ff8d85;
}

@media (prefers-color-scheme: dark) {
  html[data-theme-mode="system"] {
    /* same values as the dark block */
  }
}

@media (prefers-color-scheme: light) {
  html[data-theme-mode="system"] {
    /* same values as the light block */
  }
}
```

- [ ] **Step 4: Run the CSS contract test again**

Run: `bun test test/ui-theme-css.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/_.css test/ui-theme-css.test.ts
git commit -m "feat: add ui theme css contract"
```

## Task 4: Exercise the Public UI Exports in Consumer Smoke Tests

**Files:**
- Modify: `test/demo-local-consumer.ts`

- [ ] **Step 1: Extend the consumer fixture to import the new UI exports**

Update the generated consumer entry to include:

```ts
import "solid-lib/ui.css";
import { initializeThemeMode, setThemeMode } from "solid-lib/ui";

initializeThemeMode();
setThemeMode("dark");
```

- [ ] **Step 2: Run the local consumer smoke test to verify it fails**

Run: `bun run test:local-consumer`
Expected: FAIL because the new `ui` export and CSS subpath are not fully wired for the consumer build yet.

- [ ] **Step 3: Make the consumer build pass without widening scope**

Keep the generated app simple:

```tsx
const App = () => {
  initializeThemeMode();
  setThemeMode("dark");
  return <button type="button">Themed consumer</button>;
};
```

Only fix the packaging/export issues required for this build to succeed.

- [ ] **Step 4: Run both consumer smoke modes**

Run:
- `bun run test:local-consumer`
- `bun run test:packed-consumer`

Expected: PASS in both modes

- [ ] **Step 5: Commit**

```bash
git add test/demo-local-consumer.ts package.json src/ui/_.ts src/ui/_.css
git commit -m "test: cover ui exports in consumer smoke build"
```

## Task 5: Add a Demo Playground that Uses Only the New Variables

**Files:**
- Modify: `demo/global.d.ts`
- Modify: `demo/src/_.tsx`
- Create: `demo/src/ThemePlayground.tsx`
- Create: `demo/src/ThemePlayground.module.css`

- [ ] **Step 1: Write the demo typecheck expectation first**

Plan the demo imports up front:

```tsx
import "solid-lib/ui.css";
import { createSignal, onMount } from "solid-js";
import { initializeThemeMode, setThemeMode } from "solid-lib/ui";
```

`demo/global.d.ts` needs to include:

```ts
declare module "*.css" {
  const css: string;
  export default css;
}
```

- [ ] **Step 2: Run the demo typecheck to verify it fails**

Run: `cd demo && bun run typecheck`
Expected: FAIL because `ThemePlayground.tsx` does not exist and plain `.css` imports are not declared.

- [ ] **Step 3: Build the minimal playground**

`demo/src/_.tsx`:

```tsx
import "solid-lib/ui.css";
import ThemePlayground from "./ThemePlayground";

const App = () => <ThemePlayground />;
export default App;
```

`demo/src/ThemePlayground.tsx`:

```tsx
import { createSignal, onMount } from "solid-js";
import { initializeThemeMode, setThemeMode, type ThemeMode } from "solid-lib/ui";
import styles from "./ThemePlayground.module.css";

const ThemePlayground = () => {
  const [mode, setMode] = createSignal<ThemeMode>("system");

  onMount(() => {
    setMode(initializeThemeMode());
  });

  const applyMode = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    setMode(nextMode);
  };

  return (
    <main class={styles.shell}>
      <div class={styles.controls}>
        <button type="button" onClick={() => applyMode("system")}>System</button>
        <button type="button" onClick={() => applyMode("light")}>Light</button>
        <button type="button" onClick={() => applyMode("dark")}>Dark</button>
      </div>
      <section class={styles.card}>
        <input class={styles.input} value="Inset field" />
        <div class={styles.actions}>
          <button type="button">Base</button>
          <button type="button" class={styles.theme}>Theme</button>
          <button type="button" class={styles.disabled}>Disabled</button>
        </div>
        <p class={styles.error}>Enter a valid email address.</p>
      </section>
    </main>
  );
};
```

`demo/src/ThemePlayground.module.css` should consume only the public variables:

```css
.shell {
  background: var(--base-bg);
  color: var(--base-fg);
}

.card {
  background: var(--raised-bg);
  color: var(--raised-fg);
}

.input {
  background: var(--inset-bg);
  color: var(--inset-fg);
}

.theme {
  background: var(--theme-color);
}

.error {
  color: var(--error-color);
}
```

- [ ] **Step 4: Run demo verification**

Run:
- `cd demo && bun run typecheck`
- `cd demo && bun run build`

Expected:
- typecheck PASS
- build PASS with CSS and JS output

- [ ] **Step 5: Commit**

```bash
git add demo/global.d.ts demo/src/_.tsx demo/src/ThemePlayground.tsx demo/src/ThemePlayground.module.css
git commit -m "demo: add ui theme playground"
```

## Task 6: Full Verification Pass

**Files:**
- Modify: any files still needed from earlier tasks

- [ ] **Step 1: Run the focused unit suite**

Run:
- `bun test test/package-metadata.test.ts`
- `bun test test/theme.test.ts`
- `bun test test/ui-theme-css.test.ts`

Expected: PASS

- [ ] **Step 2: Run the broader verification commands**

Run:
- `bun run test:unit`
- `bun run test:local-consumer`
- `bun run test:packed-consumer`
- `cd demo && bun run typecheck`
- `cd demo && bun run build`

Expected: PASS

- [ ] **Step 3: Sanity-check the public API surface**

Confirm manually:
- `solid-lib/ui` exports the runtime functions
- `solid-lib/ui.css` resolves in both linked and packed consumers
- `html[data-theme-mode]` is the only runtime mode hook

- [ ] **Step 4: Update docs if any path drifted during implementation**

If command names, import paths, or API names drifted from the spec or README, fix them before finalizing.

- [ ] **Step 5: Commit**

```bash
git add package.json README.md src/ui/README.md src/ui/_.ts src/ui/theme.ts src/ui/_.css test/theme.test.ts test/package-metadata.test.ts test/ui-theme-css.test.ts test/demo-local-consumer.ts demo/global.d.ts demo/src/_.tsx demo/src/ThemePlayground.tsx demo/src/ThemePlayground.module.css
git commit -m "feat: implement ui theme system"
```

## Notes

- Keep `theme` and `error` as injected single colors. Do not expand them to `bg/fg/border` unless a failing verification step proves the current contract is insufficient.
- Keep `border` out of the default public contract for this iteration.
- Preserve the spec's language: `base / raised / inset / disabled`, not `light / dark` surface naming.
- Do not widen scope into a full component library. The goal is a stable theme foundation plus one demo playground.
