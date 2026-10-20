import { expect, test } from "./harness/test.ts";
import { readText, exists } from "./harness/io.ts";
import { join } from "node:path";

test("root entry exports the public component and utility primitives", async () => {
	const source = await readText(join(import.meta.dirname, "..", "src", "_.ts"));

	expect(source).toContain('export { Card, type CardProps } from "./Card";');
	expect(source).toContain("type ButtonTapHandler");
	expect(source).not.toContain("./buttonCore");
	expect(source).toContain(
		'export { initTheme, useTheme, initAccent, useAccent } from "./Theme";',
	);
	expect(source).toContain('export { createStorage } from "./createStorage";');
	expect(source).toContain('export { useMediaQuery } from "./useMediaQuery";');
	expect(source).toContain('export { loadScript } from "./loadScript";');
	expect(source).toContain('export { loadStyle } from "./loadStyle";');
});

test("flat source keeps generic helpers beside UI components", async () => {
	const [buttonSource, loadMoreSource, themeSource, swiperSource, plyrSource, utilsSource] =
		await Promise.all([
			readText(join(import.meta.dirname, "..", "src", "Button.tsx")),
			readText(join(import.meta.dirname, "..", "src", "LoadMore.tsx")),
			readText(join(import.meta.dirname, "..", "src", "Theme.tsx")),
			readText(join(import.meta.dirname, "..", "src", "Swiper.tsx")),
			readText(join(import.meta.dirname, "..", "src", "Plyr.tsx")),
			readText(join(import.meta.dirname, "..", "src", "_.ts")),
		]);

	expect(await exists(join(import.meta.dirname, "..", "src", "loadScript.ts"))).toBe(true);
	expect(await exists(join(import.meta.dirname, "..", "src", "loadStyle.ts"))).toBe(true);
	expect(await exists(join(import.meta.dirname, "..", "src", "useMediaQuery.ts"))).toBe(true);
	expect(await exists(join(import.meta.dirname, "..", "src", "ui", "loadScript.ts"))).toBe(false);
	expect(await exists(join(import.meta.dirname, "..", "src", "ui", "loadStyle.ts"))).toBe(false);
	expect(await exists(join(import.meta.dirname, "..", "src", "ui", "useMediaQuery.ts"))).toBe(
		false,
	);
	expect(await exists(join(import.meta.dirname, "..", "src", "buttonCore.ts"))).toBe(false);

	expect(buttonSource).not.toContain('from "./buttonCore"');
	expect(loadMoreSource).toContain('from "./useLoad"');
	expect(loadMoreSource).not.toContain('from "./useScrollEnd');
	expect(loadMoreSource).not.toContain("createSignal");
	expect(loadMoreSource).not.toContain("getToVisBottom");
	expect(themeSource).toContain('from "./themeAccent"');
	expect(themeSource).not.toContain('from "./createStorage"');
	expect(themeSource).toContain('from "./themeMode"');
	expect(swiperSource).toContain('from "./loadScript"');
	expect(plyrSource).toContain('from "./loadScript"');
	expect(plyrSource).toContain('from "./loadStyle"');
	expect(utilsSource).toContain('export { useMediaQuery } from "./useMediaQuery";');
	expect(utilsSource).toContain('export { loadScript } from "./loadScript";');
	expect(utilsSource).toContain('export { loadStyle } from "./loadStyle";');
});

test("ui and utils use Solid 2.0 lifecycle primitives instead of createTrackedEffect", async () => {
	const paths = [
		"src/BottomTab.tsx",
		"src/CountDown.tsx",
		"src/LeftTab.tsx",
		"src/LoadMore.tsx",
		"src/MenuTab.tsx",
		"src/NavTab.tsx",
		"src/SortListBox.tsx",
		"src/TopTab.tsx",
		"src/Modal.tsx",
		"src/createFullscreen.ts",
		"src/useClass.ts",
		"src/useKeepScroll.ts",
	];
	const sources = await Promise.all(
		paths.map((path) => readText(join(import.meta.dirname, "..", path))),
	);

	for (const source of sources) {
		expect(source).not.toContain("createTrackedEffect");
	}

	// Component-level one-shot setup/teardown uses onSettled (Tabs restore index via createSignal init).
	for (const path of [
		"src/CountDown.tsx",
		"src/MenuTab.tsx",
		"src/NavTab.tsx",
		"src/SortListBox.tsx",
		"src/createFullscreen.ts",
	]) {
		const source = await readText(join(import.meta.dirname, "..", path));
		expect(source).toContain("onSettled");
	}

	// Simple tabs restore index from store at signal init; no no-op onSettled(toIndex(getPos)).
	for (const path of ["src/BottomTab.tsx", "src/LeftTab.tsx", "src/TopTab.tsx"]) {
		const source = await readText(join(import.meta.dirname, "..", path));
		expect(source).not.toContain("onSettled");
		expect(source).toContain("getPos(location.pathname");
	}

	// Reactive side effects use createEffect(compute, apply).
	for (const path of ["src/Modal.tsx", "src/useClass.ts", "src/useKeepScroll.ts"]) {
		const source = await readText(join(import.meta.dirname, "..", path));
		expect(source).toContain("createEffect");
	}
});

test("src packages use Solid 2.0 APIs and never 1.x-removed or app-forbidden primitives", async () => {
	const { readdir } = await import("node:fs/promises");
	const packages = ["."] as const;
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
		const dir = join(import.meta.dirname, "..", "src", pkg);
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
		const source = await readText(file);
		const rel = file.slice(file.indexOf("/src/") + 1);

		for (const token of bannedTokens) {
			expect(source, `${rel} must not use ${token}`).not.toContain(token);
		}

		// Removed package paths (allow prose comments that only mention the migration).
		expect(source).not.toMatch(
			/from\s+["']solid-js\/(?:web|store|jsx-runtime|h|html|universal)["']/,
		);
		expect(source).not.toMatch(/["']solid-js\/web["']/);
		expect(source).not.toMatch(/["']solid-js\/store["']/);

		// Collect identifiers imported from solid-js / @solidjs/*.
		for (const importMatch of source.matchAll(
			/import\s+(type\s+)?\{([^}]+)\}\s+from\s+["'](solid-js|@solidjs\/[^"']+)["']/g,
		)) {
			const names = importMatch[2]!
				.split(",")
				.map((part) => part.trim())
				.filter(Boolean)
				.map((part) =>
					part
						.replace(/^type\s+/, "")
						.split(/\s+as\s+/)[0]!
						.trim(),
				);
			for (const name of names) {
				expect(
					bannedSolidImports.has(name),
					`${rel} imports forbidden solid API: ${name}`,
				).toBe(false);
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
	const source = await readText(join(import.meta.dirname, "..", "src", "Button.tsx"));

	expect(source).toContain("const createButtonStyle");
	expect(source).toContain('typeof value === "number" ? `${value}px` : value');
	expect(source).toContain('style["--radius"] = borderRadius');
	expect(source).toContain('style["--height"] = height');
	expect(source).toContain('style["--width"] = width');
});

test("Button source keeps tap invocation async-safe", async () => {
	const source = await readText(join(import.meta.dirname, "..", "src", "Button.tsx"));

	expect(source).toContain("export type ButtonTapHandler = () => void | Promise<void>;");
	expect(source).toContain("const isPromiseLike");
	expect(source).toContain("const invokeButtonTap");
	expect(source).toContain("await result");
	expect(source).toContain("await invokeButtonTap(props.tap)");
});

test("SvgIcon source renders the provided svg string through innerHTML", async () => {
	const source = await readText(join(import.meta.dirname, "..", "src/SvgIcon.tsx"));

	expect(source).toContain("innerHTML={props.name}");
});

test("SvgIcon component source stays separate from the generated icon catalog", async () => {
	const [componentSource, iconSource] = await Promise.all([
		readText(join(import.meta.dirname, "..", "src/SvgIcon.tsx")),
		readText(join(import.meta.dirname, "..", "src/svgicons.ts")),
	]);

	expect(componentSource).not.toContain("export const icon_zoom_out_map");
	expect(componentSource.split("\n").length).toBeLessThan(80);
	expect(iconSource).toContain("export const icon_10k");
	expect(iconSource).toContain("export const icon_zoom_out_map");
});

test("ui component css modules map to the public theme tokens", async () => {
	const [buttonCss, cardCss, inputCss] = await Promise.all([
		readText(join(import.meta.dirname, "..", "src/Button.module.css")),
		readText(join(import.meta.dirname, "..", "src/Card.module.css")),
		readText(join(import.meta.dirname, "..", "src/Input.module.css")),
	]);

	expect(buttonCss).toContain("var(--accent-color)");
	expect(buttonCss).not.toContain("--pf-color");
	expect(buttonCss).not.toContain("--sf-color");
	expect(buttonCss).not.toContain("--sb-color");

	expect(cardCss).toContain("var(--raised-bg)");
	expect(cardCss).toContain("var(--raised-fg)");

	expect(inputCss).toContain("var(--base-bg)");
	expect(inputCss).toContainCode(
		".field input:disabled,\n.field textarea:disabled {\n  color: var(--disabled-color);\n  cursor: not-allowed;\n}",
	);
	expect(inputCss).toContain("var(--disabled-color)");
});

test("button and input css keep neutral defaults and state colors separated", async () => {
	const [
		buttonCss,
		inputCss,
		cardCss,
		topTabCss,
		navTabCss,
		menuTabCss,
		cityPickerCss,
		expandCss,
		timelineCss,
	] = await Promise.all([
		readText(join(import.meta.dirname, "..", "src/Button.module.css")),
		readText(join(import.meta.dirname, "..", "src/Input.module.css")),
		readText(join(import.meta.dirname, "..", "src/Card.module.css")),
		readText(join(import.meta.dirname, "..", "src/TopTab.module.css")),
		readText(join(import.meta.dirname, "..", "src/NavTab.module.css")),
		readText(join(import.meta.dirname, "..", "src/MenuTab.module.css")),
		readText(join(import.meta.dirname, "..", "src/CityPicker.module.css")),
		readText(join(import.meta.dirname, "..", "src/Expand.module.css")),
		readText(join(import.meta.dirname, "..", "src/TimeLine.module.css")),
	]);

	expect(buttonCss).toContain("border: 2px solid var(--color, var(--accent-color))");

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

test("button ripple css uses a single transform-scaled circle", async () => {
	const buttonCss = await readText(join(import.meta.dirname, "..", "src/Button.module.css"));

	const overlay = buttonCss.match(/\.button::before \{([^}]*)\}/)?.[1];
	expect(overlay).toBeDefined();
	expect(overlay).toContain("width: 200%;");
	expect(overlay).toContain("aspect-ratio: 1;");
	expect(overlay).toContain("border-radius: 50%;");
	expect(overlay).toContain("background: currentColor;");
	expect(overlay).toContain("transform: translate(-50%, -50%) scale(1);");
	expect(overlay).toContainCode(
		"transition:\n    transform 512ms ease,\n    opacity 512ms ease;",
	);
	expect(overlay).not.toContain("background-size");

	const activeOverlay = buttonCss.match(/\.button:active::before \{([^}]*)\}/)?.[1];
	expect(activeOverlay).toBeDefined();
	expect(activeOverlay).toContain("transform: translate(-50%, -50%) scale(0);");
	expect(activeOverlay).toContain("opacity: 0.28;");
	expect(activeOverlay).toContain("transition: none;");
});

test("ui public surface keeps CityPicker and Carousel as real components", async () => {
	const [barrel, cityPicker, carousel] = await Promise.all([
		readText(join(import.meta.dirname, "..", "src/_.ts")),
		readText(join(import.meta.dirname, "..", "src/CityPicker.tsx")),
		readText(join(import.meta.dirname, "..", "src/Carousel.tsx")),
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
