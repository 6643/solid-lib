import { createSignal, onSettled, untrack } from "solid-js";

/**
 * A reactive hook that persists a signal value in localStorage.
 *
 * @param key - The localStorage key
 * @param defaultValue - A plain value, or a function returning the default value
 * @returns A signal tuple [getter, setter] that syncs with localStorage
 */
export const createStorage = <T>(
    key: string,
    defaultValue: T | (() => T),
): [() => T, (value: T | ((prev: T) => T)) => void] => {
    const initial = untrack(() =>
        typeof defaultValue === "function" ? (defaultValue as () => T)() : defaultValue
    );

    const [value, setValue] = createSignal(initial as Exclude<T, Function>);

    onSettled(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                setValue(() => JSON.parse(stored));
            }
        } catch {
            // ignore parse errors
        }
    });

    const setter = (input: T | ((prev: T) => T)) => {
        setValue((prev) => {
            const next = typeof input === "function" ? (input as (prev: T) => T)(prev) : input;
            try {
                localStorage.setItem(key, JSON.stringify(next));
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

    return [value, setter];
};
