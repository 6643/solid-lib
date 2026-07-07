import { type Accessor, createSignal, createTrackedEffect, untrack } from "solid-js";

export const createDebouncedSignal = <T>(
    source: Accessor<T>,
    ms: number
): Accessor<T | undefined> => {
    const [debouncedValue, setDebouncedValue] = createSignal(untrack(source) as Exclude<T, Function>);

    createTrackedEffect(() => {
        const latestValue = source();
        const timeoutId = setTimeout(() => setDebouncedValue(() => latestValue), ms);
        return () => clearTimeout(timeoutId);
    });

    return debouncedValue;
}
