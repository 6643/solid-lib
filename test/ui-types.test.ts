import { expect, test } from "bun:test";

test("ui source typechecks with tsc", async () => {
  const process = Bun.spawn({
    cmd: ["bunx", "tsc", "--noEmit", "--pretty", "false"],
    cwd: `${import.meta.dir}/..`,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  expect(exitCode, [stdout, stderr].filter(Boolean).join("\n")).toBe(0);
});
