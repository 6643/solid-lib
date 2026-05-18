import { expect, test } from "bun:test";
import { join } from "node:path";

test("ui source typechecks with tsc", async () => {
  const subprocess = Bun.spawn({
    cmd: [process.execPath, join(import.meta.dir, "..", "node_modules", "typescript", "bin", "tsc"), "--noEmit", "--pretty", "false"],
    cwd: `${import.meta.dir}/..`,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);

  expect(exitCode, [stdout, stderr].filter(Boolean).join("\n")).toBe(0);
});
