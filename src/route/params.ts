import type { Accessor } from "solid-js";

import { ensureRouteState, getCurrentSearch } from "./state";

export type ParamParser<T> = (raw: string | null) => T;
export type ParamFallback = boolean | number | string;

export type ParamSchema = Record<string, ParamParser<any>>;

export type ParsedParams<T extends ParamSchema> = {
  readonly [K in keyof T]: ReturnType<T[K]>;
};

const TRUE_VALUES = new Set(["1", "on", "true", "yes"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const toParamParser = <T>(parserOrFallback: ParamParser<T> | ParamFallback): ParamParser<T> => {
  if (typeof parserOrFallback === "function") {
    return parserOrFallback as ParamParser<T>;
  }

  if (typeof parserOrFallback === "number") {
    return ((raw) => {
      if (raw === null || raw.trim() === "") {
        return parserOrFallback;
      }

      const parsed = Number(raw);
      return Number.isNaN(parsed) ? parserOrFallback : parsed;
    }) as ParamParser<T>;
  }

  if (typeof parserOrFallback === "boolean") {
    return ((raw) => {
      if (raw === null) {
        return parserOrFallback;
      }

      const normalized = raw.trim().toLowerCase();
      if (TRUE_VALUES.has(normalized)) {
        return true;
      }
      if (FALSE_VALUES.has(normalized)) {
        return false;
      }

      return parserOrFallback;
    }) as ParamParser<T>;
  }

  return ((raw) => raw ?? parserOrFallback) as ParamParser<T>;
};

type ParseParam = {
  (name: string, fallback: string): Accessor<string>;
  (name: string, fallback: number): Accessor<number>;
  (name: string, fallback: boolean): Accessor<boolean>;
  <T>(name: string, parser: ParamParser<T>): Accessor<T>;
};

export const parseParam: ParseParam = <T>(name: string, parserOrFallback: ParamParser<T> | ParamFallback): Accessor<T> => {
  ensureRouteState();
  const parser = toParamParser(parserOrFallback);

  return () => {
    const searchParams = new URLSearchParams(getCurrentSearch());
    return parser(searchParams.get(name));
  };
};

const readParsedParams = <T extends ParamSchema>(schema: T): ParsedParams<T> => {
  const searchParams = new URLSearchParams(getCurrentSearch());
  const next: Record<string, unknown> = {};

  for (const [key, parser] of Object.entries(schema)) {
    next[key] = (parser as ParamParser<unknown>)(searchParams.get(key));
  }

  return next as ParsedParams<T>;
};

export const parseParams = <T extends ParamSchema>(schema: T): ParsedParams<T> => {
  ensureRouteState();

  const params: Record<string, unknown> = {};

  for (const [key, parser] of Object.entries(schema)) {
    Object.defineProperty(params, key, {
      configurable: false,
      enumerable: true,
      get() {
        return readParsedParams(schema)[key as keyof T];
      },
    });
  }

  return params as ParsedParams<T>;
};
