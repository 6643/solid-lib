import { createSignal, createTrackedEffect, type Accessor } from "solid-js"

const intersectionObserverStore = new Map<Element, (entry: IntersectionObserverEntry | undefined) => void>();
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
    createTrackedEffect(() => {
        const el = typeof ref === "function" ? ref() : ref;
        if (!el) return;

        const observer = getIntersectionObserver();
        if (!observer) return;

        const setEntry = (currentEntry: IntersectionObserverEntry | undefined) => {
            if (currentEntry) callback(currentEntry);
        };

        intersectionObserverStore.set(el, setEntry);
        observer.observe(el);

        return () => {
            observer.unobserve(el);
            intersectionObserverStore.delete(el);
        };
    });
};
