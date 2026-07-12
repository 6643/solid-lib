import { createEffect, type Accessor } from "solid-js";

const resizeObserverStore = new Map<Element, (entry: ResizeObserverEntry | undefined) => void>();
let resizeObserver: ResizeObserver | undefined;

const getResizeObserver = () => {
    if (resizeObserver) return resizeObserver;
    if (!("ResizeObserver" in globalThis)) return;

    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const setEntry = resizeObserverStore.get(entry.target);
            if (setEntry) setEntry(entry);
        }
    });

    return resizeObserver;
};

export const useResize = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    callback: (entry: ResizeObserverEntry) => void,
) => {
    createEffect(
        () => (typeof ref === "function" ? ref() : ref),
        (el) => {
            if (!el) return;

            const observer = getResizeObserver();
            if (!observer) return;

            const setEntry = (currentEntry: ResizeObserverEntry | undefined) => {
                if (currentEntry) callback(currentEntry);
            };

            resizeObserverStore.set(el, setEntry);
            observer.observe(el);
            return () => {
                observer.unobserve(el);
                resizeObserverStore.delete(el);
            };
        },
    );
};
