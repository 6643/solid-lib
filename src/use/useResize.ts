import { createEffect, type Accessor, createSignal, type Setter } from "solid-js"

const resizeObserverStore = new Map<Element, Setter<ResizeObserverEntry | undefined>>();
let resizeObserver: ResizeObserver | undefined;

const getResizeObserver = () => {
    if (resizeObserver) return resizeObserver;
    if (!("ResizeObserver" in globalThis)) return;

    resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const setEntry = resizeObserverStore.get(entry.target);
            if (setEntry) setEntry(entry);
        }
    });

    return resizeObserver;
};

// The single functional useResize hook
export const useResize = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    callback: (entry: ResizeObserverEntry) => void,
) => {
    createEffect(
        () => typeof ref === "function" ? ref() : ref,  // compute
        (el) => {  // apply
            if (!el) return; // If element is not available, do nothing
            const observer = getResizeObserver();
            if (!observer) return;

            // Inlined core logic from createResizeHandler
            const [getEntry, setEntry] = createSignal<ResizeObserverEntry>();

            createEffect(
                () => getEntry(),  // compute
                (currentEntry) => {  // apply
                    if (currentEntry) callback(currentEntry);
                }
            );

            resizeObserverStore.set(el, setEntry);
            observer.observe(el)
            return () => {
                observer.unobserve(el);
                resizeObserverStore.delete(el);
            }
        }
    );
};
