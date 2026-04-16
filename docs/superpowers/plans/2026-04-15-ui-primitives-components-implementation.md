# UI Primitives Components Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public `Card` and `Input` primitives to `solid-lib/ui` and refactor the existing button variants onto one theme-aware implementation without breaking the current button names.

**Architecture:** Keep the public surface small. `src/ui/_.ts` exports the theme API plus `Card`, `Input`, and the four button variants. `Button.tsx` owns shared button behavior and compatibility props, while `Card.tsx` and `Input.tsx` stay thin wrappers over the published theme tokens. Tests verify public exports, consumer buildability, and the button core helpers that are practical to validate in Bun without a browser render harness.

**Tech Stack:** Bun tests, TypeScript, Solid components, CSS modules, existing `solid-build` smoke consumer

---

## File Structure

- Modify: `src/ui/_.ts`
  Export the new UI primitives and keep the theme API surface intact.

- Modify: `src/ui/Button.tsx`
  Replace the broken legacy implementation with one shared button core for `TextButton`, `FilledButton`, `OutlinedButton`, and `IconButton`.

- Modify: `src/ui/Button.module.css`
  Rebase button styling onto `base / raised / inset / disabled / theme-color` tokens and remove obsolete token references.

- Create: `src/ui/Card.tsx`
  Minimal raised-surface primitive.

- Create: `src/ui/Card.module.css`
  Raised-surface styling for `Card`.

- Create: `src/ui/Input.tsx`
  Minimal inset-surface text input primitive.

- Create: `src/ui/Input.module.css`
  Inset/disabled styling for `Input`.

- Modify: `src/ui/README.md`
  Document the public components and their token mapping.

- Create: `test/ui-components.test.ts`
  Verify the public UI component exports and shared button helpers.

- Modify: `test/demo-local-consumer.ts`
  Use the public UI components in the smoke consumer so build verification covers the exported surface.

- Modify: `demo/src/ThemePlayground.tsx`
  Swap the handwritten sample markup to the public `Card`, `Input`, and button components.

## Task 1: Lock the Public Export Contract

**Files:**
- Modify: `src/ui/_.ts`
- Create: `test/ui-components.test.ts`

- [ ] **Step 1: Write the failing export test**

```ts
import { expect, test } from "bun:test";
import { Card, FilledButton, IconButton, Input, OutlinedButton, TextButton } from "../src/ui/_";

test("ui exports the public component primitives", () => {
  expect(typeof Card).toBe("function");
  expect(typeof Input).toBe("function");
  expect(typeof TextButton).toBe("function");
  expect(typeof FilledButton).toBe("function");
  expect(typeof OutlinedButton).toBe("function");
  expect(typeof IconButton).toBe("function");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test test/ui-components.test.ts`
Expected: FAIL because `Card`, `Input`, and button exports are missing from `src/ui/_.ts`.

- [ ] **Step 3: Export the public component symbols**

```ts
export { Card, type CardProps } from "./Card";
export {
  FilledButton,
  IconButton,
  OutlinedButton,
  TextButton,
  type ButtonTapHandler,
  type SharedButtonProps,
} from "./Button";
export { Input, type InputProps } from "./Input";
```

- [ ] **Step 4: Run the test again**

Run: `bun test test/ui-components.test.ts`
Expected: PASS for the export assertions.

## Task 2: Refactor the Button Variants onto One Theme Core

**Files:**
- Modify: `src/ui/Button.tsx`
- Modify: `src/ui/Button.module.css`
- Modify: `test/ui-components.test.ts`

- [ ] **Step 1: Extend the failing test with shared button helper behavior**

```ts
import { createButtonStyle, invokeButtonTap } from "../src/ui/Button";

test("createButtonStyle converts numeric dimensions into px strings", () => {
  expect(
    createButtonStyle({
      borderRadius: 12,
      color: "#123456",
      height: 40,
      width: "100%",
    }),
  ).toEqual({
    "--button-border-radius": "12px",
    "--button-color": "#123456",
    "--button-height": "40px",
    "--button-width": "100%",
  });
});

test("invokeButtonTap runs sync and async taps without legacy helpers", async () => {
  let syncCount = 0;
  let asyncCount = 0;

  await invokeButtonTap(() => {
    syncCount += 1;
  });

  await invokeButtonTap(async () => {
    asyncCount += 1;
  });

  expect(syncCount).toBe(1);
  expect(asyncCount).toBe(1);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun test test/ui-components.test.ts`
Expected: FAIL because the helpers do not exist and `Button.tsx` still depends on the missing `./utils`.

- [ ] **Step 3: Implement the shared button core**

`src/ui/Button.tsx` should:

- define `ButtonTapHandler = () => void | Promise<void>`
- expose `createButtonStyle()` for numeric-to-CSS conversion
- expose `invokeButtonTap()` so the async tap path is testable without DOM rendering
- keep compatibility props: `icon`, `text`, `tap`, `borderRadius`, `color`, `bgColor`, `width`, `height`
- accept normal button attributes such as `disabled`, `type`, `title`, `name`, `value`
- default `type` to `"button"`
- only disable when `disabled` is set or an async tap is running
- keep the four public variant names backed by one shared renderer

- [ ] **Step 4: Rebase the button CSS**

`src/ui/Button.module.css` should:

- use `--base-bg` / `--base-fg` for neutral buttons
- use `--theme-color` for filled buttons
- use `--disabled-bg` / `--disabled-fg` for disabled state
- remove obsolete `--pf-color`, `--sf-color`, `--sb-color`
- fix the outlined variant color fallback

- [ ] **Step 5: Run the targeted tests again**

Run: `bun test test/ui-components.test.ts`
Expected: PASS

## Task 3: Add `Card` and `Input`

**Files:**
- Create: `src/ui/Card.tsx`
- Create: `src/ui/Card.module.css`
- Create: `src/ui/Input.tsx`
- Create: `src/ui/Input.module.css`
- Modify: `src/ui/_.ts`
- Modify: `test/ui-components.test.ts`

- [ ] **Step 1: Extend the failing export test with style contract checks**

```ts
const cardCss = await Bun.file(join(import.meta.dir, "..", "src/ui", "Card.module.css")).text();
const inputCss = await Bun.file(join(import.meta.dir, "..", "src/ui", "Input.module.css")).text();

expect(cardCss).toContain("var(--raised-bg)");
expect(cardCss).toContain("var(--raised-fg)");
expect(inputCss).toContain("var(--inset-bg)");
expect(inputCss).toContain("var(--inset-fg)");
expect(inputCss).toContain("var(--disabled-bg)");
expect(inputCss).toContain("var(--disabled-fg)");
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun test test/ui-components.test.ts`
Expected: FAIL because the component files and CSS modules do not exist yet.

- [ ] **Step 3: Implement the minimal primitives**

`Card.tsx`:

```ts
import styles from "./Card.module.css";
import type { JSX } from "solid-js";

export type CardProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Card = (props: CardProps) => <div {...props} class={`${styles.card} ${props.class ?? ""}`.trim()} />;
```

`Input.tsx`:

```ts
import styles from "./Input.module.css";
import type { JSX } from "solid-js";

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: InputProps) => <input {...props} class={`${styles.input} ${props.class ?? ""}`.trim()} />;
```

- [ ] **Step 4: Implement the token-based CSS**

`Card.module.css` should use `raised` tokens.  
`Input.module.css` should use `inset` tokens plus disabled styling.

- [ ] **Step 5: Run the targeted tests again**

Run: `bun test test/ui-components.test.ts`
Expected: PASS

## Task 4: Exercise the Public Components in the Consumer Smoke Build

**Files:**
- Modify: `test/demo-local-consumer.ts`
- Modify: `demo/src/ThemePlayground.tsx`

- [ ] **Step 1: Update the smoke consumer entry to use the public UI components**

Replace the test app with imports like:

```ts
import {
  Card,
  FilledButton,
  IconButton,
  Input,
  OutlinedButton,
  TextButton,
  initializeThemeMode,
  setThemeMode,
} from "solid-lib/ui";
```

- [ ] **Step 2: Run the smoke test to verify it fails before implementation is complete**

Run: `bun run test:local-consumer`
Expected: FAIL until the new exports and components are buildable.

- [ ] **Step 3: Update the demo playground to consume the public components**

Use `Card`, `Input`, `TextButton`, `FilledButton`, `OutlinedButton`, and `IconButton` instead of raw HTML samples.

- [ ] **Step 4: Run the smoke test again**

Run: `bun run test:local-consumer`
Expected: PASS

## Task 5: Document and Verify the Final Surface

**Files:**
- Modify: `src/ui/README.md`
- Modify: `test/ui-components.test.ts`

- [ ] **Step 1: Update the UI README**

Document:

- `Card` maps to `raised`
- `Input` maps to `inset`
- neutral buttons map to `base`
- `FilledButton` maps to `theme-color`
- disabled state maps to `disabled`

- [ ] **Step 2: Run the focused verification**

Run: `bun test test/ui-components.test.ts test/theme.test.ts test/ui-theme-css.test.ts`
Expected: PASS

- [ ] **Step 3: Run the smoke verification**

Run: `bun run test:local-consumer`
Expected: PASS

- [ ] **Step 4: Run the full unit suite**

Run: `bun test`
Expected: PASS
