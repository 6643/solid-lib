import { fail } from "node:assert/strict";
import { inspect, isDeepStrictEqual } from "node:util";

export interface Matchers {
  readonly not: Matchers;
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toMatchObject(expected: unknown): void;
  toContain(expected: unknown): void;
  /**
   * Like `toContain`, but whitespace-insensitive: every whitespace run on both
   * sides collapses to a single space. Source-text assertions then survive
   * reformatting (tab vs space indentation, re-wrapped call arguments) without
   * weakening the structural contract they encode.
   */
  toContainCode(expected: string): void;
  toMatch(pattern: string | RegExp): void;
  toThrow(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeFunction(): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toHaveLength(expected: number): void;
}

const NO_VALUE = Symbol("no-expected-value");

const preview = (value: unknown): string =>
  inspect(value, { breakLength: 100, depth: 4, maxArrayLength: 20, maxStringLength: 400 });

const expectNumber = (value: unknown, matcher: string): number => {
  if (typeof value !== "number") {
    fail(`${matcher} requires a number, received ${preview(value)}`);
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

/** Recursive subset comparison used by `toMatchObject`. */
const matchesSubset = (actual: unknown, expected: unknown): boolean => {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) && expected.every((item, index) => matchesSubset(actual[index], item))
    );
  }
  if (isRecord(expected)) {
    return (
      isRecord(actual) &&
      Object.entries(expected).every(([key, value]) => matchesSubset(actual[key], value))
    );
  }
  return Object.is(actual, expected);
};

const readMatchers = (actual: unknown, negated: boolean, message: string | undefined): Matchers => {
  const suffix = message === undefined ? "" : `\n${message}`;

  // Single failure gate: a positive assertion needs `pass`, a negated one needs
  // `!pass`. Descriptions are thunks because assertions routinely compare
  // multi-kilobyte source strings that are pointless to render on success.
  const judge = (pass: boolean, describe: () => string): void => {
    if (pass !== negated) return;
    fail(`${describe()}${suffix}`);
  };

  const describe = (relation: string): string =>
    `Expected ${preview(actual)} ${negated ? "not " : ""}to ${relation}`;

  const describeExpected = (relation: string, expected: unknown = NO_VALUE): string =>
    expected === NO_VALUE ? describe(relation) : `${describe(relation)} ${preview(expected)}`;

  return {
    get not(): Matchers {
      return readMatchers(actual, !negated, message);
    },

    toBe: (expected) => judge(Object.is(actual, expected), () => describeExpected("be", expected)),

    toEqual: (expected) =>
      judge(isDeepStrictEqual(actual, expected), () => describeExpected("equal", expected)),

    toMatchObject: (expected) =>
      judge(matchesSubset(actual, expected), () => describeExpected("match object", expected)),

    toContain: (expected) => {
      if (Array.isArray(actual)) {
        judge(actual.includes(expected), () => describeExpected("contain", expected));
        return;
      }
      if (typeof actual === "string") {
        judge(actual.includes(String(expected)), () => describeExpected("contain", expected));
        return;
      }
      fail(`toContain requires a string or an array, received ${preview(actual)}`);
    },

    toContainCode: (expected) => {
      if (typeof actual !== "string") {
        fail(`toContainCode requires a string, received ${preview(actual)}`);
      }
      judge(normalizeWhitespace(actual).includes(normalizeWhitespace(expected)), () =>
        describeExpected("contain (ignoring whitespace)", expected),
      );
    },

    toMatch: (pattern) => {
      if (typeof actual !== "string") {
        fail(`toMatch requires a string, received ${preview(actual)}`);
      }
      if (typeof pattern !== "string") {
        pattern.lastIndex = 0;
      }
      const pass = typeof pattern === "string" ? actual.includes(pattern) : pattern.test(actual);
      judge(pass, () => describeExpected("match", pattern));
    },

    toThrow: () => {
      if (typeof actual !== "function") {
        fail(`toThrow requires a function, received ${preview(actual)}`);
      }
      let thrown: unknown;
      let didThrow = false;
      try {
        actual();
      } catch (error) {
        didThrow = true;
        thrown = error;
      }
      if (didThrow === negated) {
        const outcome = didThrow
          ? `not to throw, but it threw ${preview(thrown)}`
          : "to throw, but it returned normally";
        fail(`Expected ${preview(actual)} ${outcome}${suffix}`);
      }
    },

    toBeUndefined: () => judge(Object.is(actual, undefined), () => describe("be undefined")),

    toBeDefined: () => judge(actual !== undefined, () => describe("be defined")),

    toBeFunction: () => judge(typeof actual === "function", () => describe("be a function")),

    toBeGreaterThan: (expected) => {
      const value = expectNumber(actual, "toBeGreaterThan");
      judge(value > expected, () => describeExpected("be greater than", expected));
    },

    toBeGreaterThanOrEqual: (expected) => {
      const value = expectNumber(actual, "toBeGreaterThanOrEqual");
      judge(value >= expected, () => describeExpected("be greater than or equal to", expected));
    },

    toBeLessThan: (expected) => {
      const value = expectNumber(actual, "toBeLessThan");
      judge(value < expected, () => describeExpected("be less than", expected));
    },

    toHaveLength: (expected) => {
      const length = (actual as { readonly length?: unknown } | null)?.length;
      if (typeof length !== "number") {
        fail(`toHaveLength requires a value with a numeric length, received ${preview(actual)}`);
      }
      judge(length === expected, () => describeExpected("have length", expected));
    },
  };
};

export const expect = (actual: unknown, message?: string): Matchers =>
  readMatchers(actual, false, message);
