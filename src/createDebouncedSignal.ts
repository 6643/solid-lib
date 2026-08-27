import { type Accessor, createEffect, createSignal, untrack } from "solid-js";

export const createDebouncedSignal = <T>(source: Accessor<T>, ms: number): Accessor<T | undefined> => {
    const [debouncedValue, setDebouncedValue] = createSignal(untrack(source) as Exclude<T, Function>);

    createEffect(
        () => source(),
        (latestValue) => {
            const timeoutId = setTimeout(() => setDebouncedValue(() => latestValue as Exclude<T, Function>), ms);
            return () => clearTimeout(timeoutId);
        },
    );

    return debouncedValue;
};
