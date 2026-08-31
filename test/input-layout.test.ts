import { expect, test } from "bun:test";
import { join } from "node:path";

const readInputStyles = () => Bun.file(join(import.meta.dir, "..", "src", "Input.module.css")).text();

test("TextArea overrides the single-line input height and stretches its editor", async () => {
  const css = await readInputStyles();

  expect(css).toContain(".field .inputWrap:has(textarea) {");
  expect(css).toMatch(/\.field \.inputWrap:has\(textarea\) \{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*40px;[\s\S]*?align-items:\s*stretch;/);
});

test("Input controls use only the left border for default, focus, and error states", async () => {
  const css = await readInputStyles();

  expect(css).toMatch(/\.field \.inputWrap \{[\s\S]*?border:\s*0;[\s\S]*?border-left:\s*2px solid transparent;/);
  expect(css).toContain("border-left-color: var(--accent-color);");
  expect(css).toContain("border-left-color: var(--error-color);");
  expect(css).not.toContain("border: 2px solid var(--accent-color);");
  expect(css).not.toContain("border: 2px solid var(--error-color);");
});

test("TextArea always renders a plain multiline editor without line numbers", async () => {
  const [source, css] = await Promise.all([
    Bun.file(join(import.meta.dir, "..", "src", "Input.tsx")).text(),
    readInputStyles(),
  ]);

  expect(source).toContain("class={styles.plainTextarea}");
  expect(source).not.toContain("lineNumbers");
  expect(source).not.toContain("lineNumRef");
  expect(source).not.toContain("editorWrap");
  expect(source).not.toContain("editorTextarea");
  expect(css).not.toContain(".editorWrap");
  expect(css).not.toContain(".lineNumbers");
  expect(css).not.toContain(".editorTextarea");
  expect(css).toContain(".plainTextarea {");
});

test("autofilled inputs keep the normal field theme colors", async () => {
  const css = await readInputStyles();

  expect(css).toMatch(
    /\.field input:-webkit-autofill,\n\.field textarea:-webkit-autofill \{[\s\S]*?-webkit-box-shadow: 0 0 0 1000px var\(--base-bg\) inset;[\s\S]*?-webkit-text-fill-color: var\(--base-fg\);[\s\S]*?\}/,
  );
  expect(css).toMatch(
    /\.field input:-webkit-autofill:focus,\n\.field textarea:-webkit-autofill:focus \{[\s\S]*?-webkit-box-shadow: 0 0 0 1000px var\(--base-bg\) inset;[\s\S]*?-webkit-text-fill-color: var\(--base-fg\);[\s\S]*?\}/,
  );
});

test("RangeInput keeps browser-specific track rules and uses inset track color", async () => {
  const css = await readInputStyles();

  expect(css).toContain('.rangeInput input[type="range"]::-webkit-slider-runnable-track {');
  expect(css).toContain('.rangeInput input[type="range"]::-moz-range-track {');
  expect(css).not.toContain(
    '.rangeInput input[type="range"]::-webkit-slider-runnable-track,\n.rangeInput input[type="range"]::-moz-range-track {',
  );
  expect(css).toContain("background: var(--inset-bg);");
});

test("RangeInput thumb is a 10px solid handle and the slider row is 40px tall", async () => {
  const css = await readInputStyles();

  const baseBlock = css.match(/^\.rangeInput input\[type="range"\] \{([^}]*)\}$/m)?.[1];
  expect(baseBlock).toBeDefined();
  expect(baseBlock).toContain("height: 40px;");

  const webkit = css.match(/\.rangeInput input\[type="range"\]::-webkit-slider-thumb \{([^}]*)\}/)?.[1];
  expect(webkit).toBeDefined();
  expect(webkit).toContain("width: 10px;");
  expect(webkit).toContain("height: 10px;");
  expect(webkit).toContain("background: var(--accent-color);");
  expect(webkit).toContain("margin-top: -3px;");
  expect(webkit).not.toContain("radial-gradient");
  expect(webkit).toContain("border: none;");

  const moz = css.match(/\.rangeInput input\[type="range"\]::-moz-range-thumb \{([^}]*)\}/)?.[1];
  expect(moz).toBeDefined();
  expect(moz).toContain("width: 10px;");
  expect(moz).toContain("height: 10px;");
  expect(moz).toContain("background: var(--accent-color);");
  expect(moz).not.toContain("radial-gradient");
  expect(moz).toContain("border: none;");
});

test("InputsPage uses the simplified TextArea API", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "demo", "src", "pages", "InputsPage.tsx")).text();

  expect(source).toContain('<TextArea label="简介" row={4} value={bio()} changed={setBio}');
  expect(source).not.toContain("lineNumbers");
});
