import { createEffect, type Accessor, createSignal, type Setter } from "solid-js"

const resizeObserverStore = new Map<Element, Setter<ResizeObserverEntry | undefined>>();
const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
        const setEntry = resizeObserverStore.get(entry.target);
        if (setEntry) setEntry(entry);
    }
});

// The single functional useResize hook
export const useResize = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    callback: (entry: ResizeObserverEntry) => void,
) => {
    createEffect(
        () => typeof ref === "function" ? ref() : ref,  // compute
        (el) => {  // apply
            if (!el) return; // If element is not available, do nothing

            // Inlined core logic from createResizeHandler
            const [getEntry, setEntry] = createSignal<ResizeObserverEntry>();

            createEffect(
                () => getEntry(),  // compute
                (currentEntry) => {  // apply
                    if (currentEntry) callback(currentEntry);
                }
            );

            resizeObserverStore.set(el, setEntry);
            resizeObserver.observe(el)
            return () => {
                resizeObserver.unobserve(el);
                resizeObserverStore.delete(el);
            }
        }
    );
};