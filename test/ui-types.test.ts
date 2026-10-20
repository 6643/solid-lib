import { expect, test } from "./harness/test.ts";
import { run, which } from "./harness/proc.ts";
import { join } from "node:path";

const VP_COMMAND = which("vp") ?? "vp";

test("ui source typechecks with tsc", async () => {
	const result = await run(VP_COMMAND, ["exec", "tsc", "--noEmit", "--pretty", "false"], {
		cwd: join(import.meta.dirname, ".."),
	});
	const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

	expect(result.exitCode, output).toBe(0);
});
