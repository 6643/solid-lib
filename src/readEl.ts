import type { Accessor } from "solid-js";

/** Resolve a static element or reactive accessor to the current element value. */
export const readEl = <T>(ref: T | Accessor<T | undefined | null>): T | undefined | null =>
    typeof ref === "function" ? (ref as Accessor<T | undefined | null>)() : ref;
