import { createSignal, untrack } from "solid-js";

/**
 * A reactive hook that persists a signal value in Web Storage.
 *
 * @param key - The storage key
 * @param defaultValue - A plain value, or a function returning the default value
 * @param storage - The storage backend, defaults to localStorage
 * @returns A signal tuple [getter, setter] that syncs with storage
 */
export const createStorage = <T>(
    key: string,
    defaultValue: T | (() => T),
    storage: Storage | undefined = globalThis.localStorage,
): [() => T, (value: T | ((prev: T) => T)) => void] => {
    const initial = untrack(() => {
        try {
            const stored = storage?.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored) as T;
            }
        } catch {
            // ignore storage and parse errors
        }

        return typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue;
    });

    const [value, setValue] = createSignal(initial as Exclude<T, Function>);

    const setter = (input: T | ((prev: T) => T)) => {
        setValue((prev) => {
            const next = typeof input === "function" ? (input as (prev: T) => T)(prev) : input;
            try {
                storage?.setItem(key, JSON.stringify(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

    return [value, setter];
};
