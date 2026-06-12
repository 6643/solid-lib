import { type Accessor, createEffect, createSignal, type Setter } from "solid-js";

const mutationObserverMap = new Map<string, { observer: MutationObserver, callbacks: Map<Element, Setter<MutationRecord[] | undefined>> }>();

export const useMutation = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    callback: (mutations: MutationRecord[]) => void,
    options?: MutationObserverInit
) => {
    createEffect(
        () => typeof ref === "function" ? ref() : ref,  // compute
        (el) => {  // apply
            if (!el) return; // If element is not available, do nothing

            const [getMutations, setMutations] = createSignal<MutationRecord[] | undefined>();

            createEffect(
                () => getMutations(),  // compute
                (currentMutations) => {  // apply
                    if (currentMutations) callback(currentMutations);
                }
            );

            const optionsKey = JSON.stringify(options || {});

            let entry = mutationObserverMap.get(optionsKey);
            if (!entry) {
                const observer = new MutationObserver((mutations: MutationRecord[]) => {
                    entry?.callbacks.forEach((setFn, targetEl) => {
                        const relevantMutations = mutations.filter(mut => mut.target === targetEl);
                        if (relevantMutations.length > 0) setFn(relevantMutations);
                    });
                });
                entry = { observer, callbacks: new Map() };
                mutationObserverMap.set(optionsKey, entry);
            }

            entry.callbacks.set(el, setMutations);
            entry.observer.observe(el, options);

            return () => {
                const currentEntry = mutationObserverMap.get(optionsKey);
                if (!currentEntry) return;

                currentEntry.callbacks.delete(el); // Remove the element's callback

                if (currentEntry.callbacks.size === 0) {
                    // If no more elements are observed by this observer, disconnect and delete it
                    currentEntry.observer.disconnect();
                    mutationObserverMap.delete(optionsKey);
                } else {
                    // If there are still other elements, disconnect and re-observe them
                    currentEntry.observer.disconnect();
                    currentEntry.callbacks.forEach((_, targetEl) => {
                        currentEntry.observer.observe(targetEl, options);
                    });
                }
            };
        }
    );
};
