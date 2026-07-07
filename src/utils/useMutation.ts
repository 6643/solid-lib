import { type Accessor, createTrackedEffect } from "solid-js";

const mutationObserverMap = new Map<string, { observer: MutationObserver, callbacks: Map<Element, (mutations: MutationRecord[] | undefined) => void> }>();

export const useMutation = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    callback: (mutations: MutationRecord[]) => void,
    options?: MutationObserverInit
) => {
    createTrackedEffect(() => {
        const el = typeof ref === "function" ? ref() : ref;
        if (!el) return;

        const optionsKey = JSON.stringify(options || {});

        let entry = mutationObserverMap.get(optionsKey);
        if (!entry) {
            const observer = new MutationObserver((mutations: MutationRecord[]) => {
                entry?.callbacks.forEach((setFn, targetEl) => {
                    const relevantMutations = mutations.filter((mut) => mut.target === targetEl);
                    if (relevantMutations.length > 0) setFn(relevantMutations);
                });
            });
            entry = { observer, callbacks: new Map() };
            mutationObserverMap.set(optionsKey, entry);
        }

        const setMutations = (mutations: MutationRecord[] | undefined) => {
            if (mutations) callback(mutations);
        };

        entry.callbacks.set(el, setMutations);
        entry.observer.observe(el, options);

        return () => {
            const currentEntry = mutationObserverMap.get(optionsKey);
            if (!currentEntry) return;

            currentEntry.callbacks.delete(el);

            if (currentEntry.callbacks.size === 0) {
                currentEntry.observer.disconnect();
                mutationObserverMap.delete(optionsKey);
                return;
            }

            currentEntry.observer.disconnect();
            currentEntry.callbacks.forEach((_, targetEl) => {
                currentEntry.observer.observe(targetEl, options);
            });
        };
    });
};
