import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

export interface RunResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}

export interface RunOptions {
	readonly cwd?: string;
}

/** Runs a command to completion; a non-zero exit code resolves, it does not throw. */
export const run = (
	command: string,
	args: readonly string[],
	options: RunOptions = {},
): Promise<RunResult> =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
		child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
		child.once("error", reject);
		child.once("close", (code) => {
			resolve({
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				exitCode: code ?? -1,
			});
		});
	});

/** Runs a command and throws unless it exits 0. */
export const mustRun = async (
	command: string,
	args: readonly string[],
	options: RunOptions = {},
): Promise<RunResult> => {
	const result = await run(command, args, options);
	if (result.exitCode !== 0) {
		const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
		throw new Error(
			`Command exited ${result.exitCode}: ${[command, ...args].join(" ")}\n${output}`,
		);
	}
	return result;
};

/** Resolves a binary on PATH. */
export const which = (binary: string): string | undefined => {
	const directories = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
	return directories.map((directory) => join(directory, binary)).find((path) => existsSync(path));
};

/** Awaits a delay in milliseconds. */
export const sleep = (milliseconds: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, milliseconds));
