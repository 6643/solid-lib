import { expect, test } from "bun:test";
import { join } from "node:path";

import { createButtonStyle, invokeButtonTap } from "../src/ui/Button";
import { extractSvgIconPaths } from "../src/ui/SvgIcon";

test("ui exports the public component primitives", async () => {
  const ui = await import("../src/ui/_");

  expect(typeof ui.Card).toBe("function");
  expect(typeof ui.Input).toBe("function");
  expect(typeof ui.TextButton).toBe("function");
  expect(typeof ui.FilledButton).toBe("function");
  expect(typeof ui.OutlinedButton).toBe("function");
  expect(typeof ui.IconButton).toBe("function");
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
    "--button-border-radius": "12px",
    "--button-color": "#123456",
    "--button-height": "40px",
    "--button-width": "100%",
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

test("SvgIcon extracts only plain path data from raw icon markup", () => {
  expect(extractSvgIconPaths('<path d="M240-510h480v60H240z"/>')).toEqual(["M240-510h480v60H240z"]);
  expect(extractSvgIconPaths('<path d="M0 0"></path>')).toEqual(["M0 0"]);
  expect(extractSvgIconPaths('<path d="M0 0" onload="alert(1)"/>')).toEqual([]);
  expect(extractSvgIconPaths('<path d="M0 0"/><script>alert(1)</script>')).toEqual([]);
});

test("SvgIcon source does not inject raw icon strings through innerHTML", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "src/ui/SvgIcon.tsx")).text();

  expect(source).not.toContain("innerHTML");
});

test("SvgIcon component source stays separate from the generated icon catalog", async () => {
  const [componentSource, iconSource] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src/ui/SvgIcon.tsx")).text(),
    Bun.file(join(import.meta.dir, "..", "src/ui/icons.ts")).text(),
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

  expect(buttonCss).toContain("var(--base-bg)");
  expect(buttonCss).toContain("var(--theme-color)");
  expect(buttonCss).toContain("var(--disabled-bg)");
  expect(buttonCss).not.toContain("--pf-color");
  expect(buttonCss).not.toContain("--sf-color");
  expect(buttonCss).not.toContain("--sb-color");

  expect(cardCss).toContain("var(--raised-bg)");
  expect(cardCss).toContain("var(--raised-fg)");

  expect(inputCss).toContain("var(--inset-bg)");
  expect(inputCss).toContain("var(--inset-fg)");
  expect(inputCss).toContain("var(--disabled-bg)");
  expect(inputCss).toContain("var(--disabled-fg)");
});
