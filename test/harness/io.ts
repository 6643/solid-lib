import { readFile, stat } from "node:fs/promises";

/** Reads a UTF-8 text file. */
export const readText = (path: string): Promise<string> => readFile(path, "utf8");

/** Reports whether a path exists, without throwing on missing entries. */
export const exists = async (path: string): Promise<boolean> => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};
