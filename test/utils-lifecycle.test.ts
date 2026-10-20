import { describe, expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { sleep } from "./harness/proc.ts";
import { join } from "node:path";

import { createDebounce } from "../src/createDebounce.ts";
import { selectRelevantMutations } from "../src/useMutation.ts";

const readSource = (path: string) => readText(join(import.meta.dirname, "..", path));

describe("createDebounce", () => {
	test("exposes cancel that prevents a pending callback", async () => {
		let calls = 0;
		const debounced = createDebounce(() => {
			calls += 1;
		}, 20);

		debounced();
		expect(typeof debounced.cancel).toBe("function");
		debounced.cancel();

		await sleep(40);
		expect(calls).toBe(0);
	});

	test("invokes the callback after wait when not cancelled", async () => {
		let calls = 0;
		const debounced = createDebounce(() => {
			calls += 1;
		}, 15);

		debounced();
		await sleep(40);
		expect(calls).toBe(1);
	});
});

describe("useMutation", () => {
	test("selectRelevantMutations includes records whose target is a descendant", () => {
		// 伪 Node 目标：仅供身份比较，不参与真实 DOM（断言语义不变）
		const child = { id: "child" } as unknown as Node;
		const outsider = { id: "out" } as unknown as Node;
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

		const relevant = selectRelevantMutations(
			[record(child), record(outsider), record(root)],
			root,
		);
		// child + root itself; outsider excluded
		expect(relevant).toHaveLength(2);
		expect(relevant.some((m) => m.target === child)).toBe(true);
		expect(relevant.some((m) => m.target === root)).toBe(true);
		expect(relevant.some((m) => m.target === outsider)).toBe(false);
	});

	test("useMutation source uses selectRelevantMutations (not strict target equality only)", async () => {
		const source = await readSource("src/useMutation.ts");
		expect(source).toContain("selectRelevantMutations");
		expect(source).toContain("targetEl.contains");
		expect(source).toContain("createEffect(");
		expect(source).not.toContain("onCleanup");
	});
});

describe("useScrollEnd + useWakeLock + useLongPress lifecycle contracts (Solid 2.0)", () => {
	test("Input effects return cleanup functions instead of signal setter values", async () => {
		const source = await readSource("src/Input.tsx");
		expect(source).not.toMatch(/\(next\)\s*=>\s*setValue\(next\)/);
		expect(source).toMatch(/\(next\)\s*=>\s*\{\s*setValue\(next\);\s*\}/);
	});

	test("CountDown clears its interval when it reaches zero", async () => {
		const source = await readSource("src/CountDown.tsx");
		expect(source).toMatch(/current\s*<=\s*0[\s\S]*clearInterval\(timer\)/);
	});

	test("useRefresh creates reactive primitives at hook scope", async () => {
		const source = await readSource("src/useRefresh.ts");
		const effectBody = source.slice(source.indexOf("createEffect("));
		expect(effectBody).not.toContain("createSignal(");
		expect(effectBody).not.toContain("createMemo(");
	});

	test("DigitWheel does not read its spring signal in an effect apply callback", async () => {
		const source = await readSource("src/DigitWheel.tsx");
		expect(source).toContain("const current = untrack(value);");
		expect(source).not.toContain("const current = value();");
	});

	test("useScrollEnd cancels pending debounce on cleanup", async () => {
		const source = await readSource("src/useScrollEnd.ts");
		expect(source).toContain("createDebounce");
		expect(source).toContain(".cancel");
		expect(source).toContain("createEffect(");
		expect(source).not.toContain("onCleanup");
		expect(source).not.toContain("onMount");
	});

	test("useWakeLock uses desired state, releases on dispose, re-requests when visible", async () => {
		const source = await readSource("src/useWakeLock.ts");
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
		const source = await readSource("src/useGestures.ts");
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
