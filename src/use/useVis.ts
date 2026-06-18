import { type Accessor, createEffect, createSignal, type Setter } from "solid-js"

const intersectionObserverStore = new Map<Element, Setter<IntersectionObserverEntry | undefined>>();
let intersectionObserver: IntersectionObserver | undefined;

const getIntersectionObserver = () => {
    if (intersectionObserver) return intersectionObserver;
    if (!("IntersectionObserver" in globalThis)) return;

    intersectionObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
            const setEntry = intersectionObserverStore.get(entry.target);
            if (setEntry) setEntry(entry);
        }
    });

    return intersectionObserver;
};

// The single functional useVis hook
export const useVis = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    callback: (entry: IntersectionObserverEntry) => void,
) => {
    createEffect(
        () => typeof ref === "function" ? ref() : ref,  // compute
        (el) => {  // apply
            if (!el) return; // If element is not available, do nothing
            const observer = getIntersectionObserver();
            if (!observer) return;

            // Inlined core logic from createVisHandler
            const [getEntry, setEntry] = createSignal<IntersectionObserverEntry>();

            createEffect(
                () => getEntry(),  // compute
                (currentEntry) => {  // apply
                    if (currentEntry) callback(currentEntry);
                }
            );

            intersectionObserverStore.set(el, setEntry);
            observer.observe(el);

            return () => {
                observer.unobserve(el);
                intersectionObserverStore.delete(el);
            };
        }
    );
};
