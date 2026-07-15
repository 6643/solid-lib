import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { createDebounce } from "../src/utils/createDebounce";
import { selectRelevantMutations } from "../src/utils/useMutation";

const readSource = (path: string) => Bun.file(join(import.meta.dir, "..", path)).text();

describe("createDebounce", () => {
  test("exposes cancel that prevents a pending callback", async () => {
    let calls = 0;
    const debounced = createDebounce(() => {
      calls += 1;
    }, 20);

    debounced();
    expect(typeof debounced.cancel).toBe("function");
    debounced.cancel();

    await Bun.sleep(40);
    expect(calls).toBe(0);
  });

  test("invokes the callback after wait when not cancelled", async () => {
    let calls = 0;
    const debounced = createDebounce(() => {
      calls += 1;
    }, 15);

    debounced();
    await Bun.sleep(40);
    expect(calls).toBe(1);
  });
});

describe("useMutation", () => {
  test("selectRelevantMutations includes records whose target is a descendant", () => {
    const child = { id: "child" };
    const outsider = { id: "out" };
    const root = {
      contains(node: unknown) {
        return node === root || node === child;
      },
    } as unknown as Element;

    const record = (target: unknown): MutationRecord =>
      ({
        type: "childList",
        target,
        addedNodes: [] as unknown as NodeList,
        removedNodes: [] as unknown as NodeList,
        previousSibling: null,
        nextSibling: null,
        attributeName: null,
        attributeNamespace: null,
        oldValue: null,
      }) as MutationRecord;

    const relevant = selectRelevantMutations([record(child), record(outsider), record(root)], root);
    // child + root itself; outsider excluded
    expect(relevant).toHaveLength(2);
    expect(relevant.some((m) => m.target === child)).toBe(true);
    expect(relevant.some((m) => m.target === root)).toBe(true);
    expect(relevant.some((m) => m.target === outsider)).toBe(false);
  });

  test("useMutation source uses selectRelevantMutations (not strict target equality only)", async () => {
    const source = await readSource("src/utils/useMutation.ts");
    expect(source).toContain("selectRelevantMutations");
    expect(source).toContain("targetEl.contains");
    expect(source).toContain("createEffect(");
    expect(source).not.toContain("onCleanup");
  });
});

describe("useScrollEnd + useWakeLock + useLongPress lifecycle contracts (Solid 2.0)", () => {
  test("Input effects return cleanup functions instead of signal setter values", async () => {
    const source = await readSource("src/ui/Input.tsx");
    expect(source).not.toMatch(/\(next\)\s*=>\s*setValue\(next\)/);
    expect(source).toMatch(/\(next\)\s*=>\s*\{\s*setValue\(next\);\s*\}/);
  });

  test("CountDown clears its interval when it reaches zero", async () => {
    const source = await readSource("src/ui/CountDown.tsx");
    expect(source).toMatch(/current\s*<=\s*0[\s\S]*clearInterval\(timer\)/);
  });

  test("useRefresh creates reactive primitives at hook scope", async () => {
    const source = await readSource("src/utils/useRefresh.ts");
    const effectBody = source.slice(source.indexOf("createEffect("));
    expect(effectBody).not.toContain("createSignal(");
    expect(effectBody).not.toContain("createMemo(");
  });

  test("DigitWheel does not read its spring signal in an effect apply callback", async () => {
    const source = await readSource("src/ui/DigitWheel.tsx");
    expect(source).toContain("const current = untrack(value);");
    expect(source).not.toContain("const current = value();");
  });

  test("useScrollEnd cancels pending debounce on cleanup", async () => {
    const source = await readSource("src/utils/useScrollEnd.ts");
    expect(source).toContain("createDebounce");
    expect(source).toContain(".cancel");
    expect(source).toContain("createEffect(");
    expect(source).not.toContain("onCleanup");
    expect(source).not.toContain("onMount");
  });

  test("useWakeLock uses desired state, releases on dispose, re-requests when visible", async () => {
    const source = await readSource("src/utils/useWakeLock.ts");
    expect(source).toContain("onSettled");
    expect(source).not.toMatch(/\bonCleanup\b/);
    expect(source).not.toMatch(/\bonMount\b/);
    // desired intent vs actual lock
    expect(source).toMatch(/\bdesired\b/);
    expect(source).toContain("release");
    expect(source).toContain("visibilitychange");
    // dispose must release
    expect(source).toMatch(/onSettled\(\(\)\s*=>\s*\{[\s\S]*release/);
  });

  test("useLongPress clears timer on effect dispose", async () => {
    const source = await readSource("src/utils/useGestures.ts");
    expect(source).toContain("createEffect(");
    expect(source).not.toMatch(/\bonCleanup\b/);
    expect(source).not.toMatch(/\bonMount\b/);
    // long-press path must clearTimer in a cleanup return
    expect(source).toMatch(/return\s*\(\)\s*=>\s*clearTimer\(\)/);
  });
});

describe("createDebounce return type shape", () => {
  test("debounced function keeps call signature and cancel", () => {
    const debounced = createDebounce((n: number) => n, 1);
    debounced(1);
    debounced.cancel();
    expect(typeof debounced).toBe("function");
  });
});


describe("route parseParams types + builder dev signature (source contracts)", () => {
  test("parseParams return type uses ParsedParams not parser functions", async () => {
    const source = await readSource("src/route/params.ts");
    expect(source).toContain("Accessor<ParsedParams<T>[K]>");
    expect(source).not.toMatch(/parseParams[\s\S]*Accessor<T\[K\]>/);
  });

  test("dev poll updates previousSignature only after successful rebuild", async () => {
    const source = await readSource("src/builder/dev.ts");
    // success path still assigns signature
    expect(source).toContain("previousSignature = createWatchSignature(currentConfig)");
    // poll path must not assign before rebuild
    const pollBlock = source.slice(source.indexOf("const pollTimer = setInterval"));
    expect(pollBlock).toContain("if (nextSignature !== previousSignature)");
    expect(pollBlock).not.toMatch(/previousSignature\s*=\s*nextSignature/);
  });
});
