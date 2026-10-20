import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const legacyThemeTokens = /--(?:page-bg|page-fg|sunken-bg|sunken-fg|disabled-bg|disabled-fg)/;

const readSources = async (root: string): Promise<string[]> => {
	const entries = await readdir(root, { withFileTypes: true });
	const sources: string[] = [];

	for (const entry of entries) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) {
			sources.push(...(await readSources(path)));
			continue;
		}
		if (/\.(css|ts|tsx)$/.test(entry.name)) sources.push(await readText(path));
	}

	return sources;
};

test("source styles use the replacement theme tokens without legacy page, sunken, or disabled bg/fg tokens", async () => {
	const sources = await Promise.all([
		readSources(join(import.meta.dirname, "..", "src")),
		readSources(join(import.meta.dirname, "..", "demo", "src")),
	]);

	for (const source of sources.flat()) {
		expect(source).not.toMatch(legacyThemeTokens);
	}
});
