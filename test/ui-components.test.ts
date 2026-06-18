import { expect, test } from "bun:test";
import { join } from "node:path";

import { createButtonStyle, invokeButtonTap } from "../src/ui/Button";

const originalResizeObserver = (globalThis as Record<string, unknown>).ResizeObserver;
const originalIntersectionObserver = (globalThis as Record<string, unknown>).IntersectionObserver;

test("ui exports the public component primitives", async () => {
  delete (globalThis as Record<string, unknown>).ResizeObserver;
  delete (globalThis as Record<string, unknown>).IntersectionObserver;
  const ui = await import("../src/ui/_");

  expect(typeof ui.Card).toBe("function");
  expect(typeof ui.TextInput).toBe("function");
  expect(typeof ui.TextButton).toBe("function");
  expect(typeof ui.FilledButton).toBe("function");
  expect(typeof ui.OutlinedButton).toBe("function");
  expect(typeof ui.IconButton).toBe("function");
  expect(typeof ui.initializeThemeMode).toBe("function");

  if (typeof originalResizeObserver === "undefined") {
    delete (globalThis as Record<string, unknown>).ResizeObserver;
  } else {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: originalResizeObserver,
    });
  }

  if (typeof originalIntersectionObserver === "undefined") {
    delete (globalThis as Record<string, unknown>).IntersectionObserver;
  } else {
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: originalIntersectionObserver,
    });
  }
});

test("createButtonStyle converts numeric dimensions into css sizes", () => {
  expect(
    createButtonStyle({
      borderRadius: 12,
      color: "#123456",
      height: 40,
      width: "100%",
    }),
  ).toEqual({
    "--radius": "12px",
    "--color": "#123456",
    "--height": "40px",
    "--width": "100%",
  });
});

test("invokeButtonTap supports sync and async taps", async () => {
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

  expect(buttonCss).toContain("var(--raised-bg)");
  expect(buttonCss).not.toContain("--pf-color");
  expect(buttonCss).not.toContain("--sf-color");
  expect(buttonCss).not.toContain("--sb-color");

  expect(cardCss).toContain("var(--base-bg)");
  expect(cardCss).toContain("var(--primary-fg)");

  expect(inputCss).toContain("var(--inset-bg)");
  expect(inputCss).toContain("var(--secondary-fg)");
  expect(inputCss).toContain("var(--disabled-color)");
  expect(inputCss).toContain("var(--secondary-fg)");
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

  expect(buttonCss).toContain("border: 2px solid var(--color, var(--secondary-fg))");

  expect(buttonCss).not.toContain("color-mix(");
  expect(inputCss).not.toContain("color-mix(");
  expect(cardCss).not.toContain("color-mix(");
  expect(topTabCss).not.toContain("color-mix(");
  expect(navTabCss).not.toContain("color-mix(");
  expect(menuTabCss).not.toContain("color-mix(");

  expect(cityPickerCss).not.toContain("white");
  expect(expandCss).not.toContain("white");
  expect(cardCss).not.toContain("rgba(");
  expect(topTabCss).not.toContain("rgba(");
  expect(menuTabCss).not.toContain("rgba(");
  expect(inputCss).not.toContain("rgba(");
  expect(timelineCss).not.toContain("antiquewhite");
});

test("button ripple css uses a single scaled overlay instead of tiled gradients", async () => {
  const buttonCss = await Bun.file(join(import.meta.dir, "..", "src/ui/Button.module.css")).text();

  expect(buttonCss).not.toContain("background-image: radial-gradient(");
  expect(buttonCss).not.toContain("background-size:");
  expect(buttonCss).toContain("scale(0)");
  expect(buttonCss).toContain("scale(1)");
  expect(buttonCss).toContain("border-radius: 999px");
});
