import type { Accessor } from "solid-js";

import { ensureRouteState, getCurrentSearch } from "./state";

export type ParamParser<T> = (raw: string | null) => T;
export type ParamFallback = boolean | number | string;

export type ParamSchema = Record<string, ParamParser<unknown>>;

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
            return Number.isFinite(parsed) ? parsed : parserOrFallback;
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

export const parseParam: ParseParam = <T>(name: string, parserOrFallback: ParamParser<T> | ParamFallback) => {
    ensureRouteState();
    const parser = toParamParser(parserOrFallback);

    return () => {
        const searchParams = new URLSearchParams(getCurrentSearch());
        return parser(searchParams.get(name));
    };
};

export const parseParams = <T extends ParamSchema>(
    schema: T,
): { readonly [K in keyof T]: Accessor<ParsedParams<T>[K]> } => {
    ensureRouteState();

    const result = {} as { [K in keyof T]: Accessor<ParsedParams<T>[K]> };
    let cachedSearch: string | undefined;
    let cachedParams: URLSearchParams | undefined;

    const getSearchParams = () => {
        const search = getCurrentSearch();
        if (cachedParams && search === cachedSearch) {
            return cachedParams;
        }
        cachedSearch = search;
        cachedParams = new URLSearchParams(search);
        return cachedParams;
    };

    for (const key of Object.keys(schema) as Array<keyof T & string>) {
        const parser = schema[key] as ParamParser<ParsedParams<T>[typeof key]>;
        result[key] = () => parser(getSearchParams().get(key));
    }

    return result;
};
