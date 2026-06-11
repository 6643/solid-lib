import { type Accessor, createSignal, createEffect, onCleanup } from "solid-js";

export const createDebouncedSignal = <T>(
    source: Accessor<T>,
    ms: number
): Accessor<T | undefined> => {
    const [debouncedValue, setDebouncedValue] = createSignal(source() as Exclude<T, Function>);

    createEffect(
        () => source(),  // compute
        (latestValue) => {  // apply
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            timeoutId = setTimeout(() => setDebouncedValue(() => latestValue), ms);
            onCleanup(() => clearTimeout(timeoutId));
        }
    );

    return debouncedValue;
}