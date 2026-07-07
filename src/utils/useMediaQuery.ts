import { createSignal, createTrackedEffect } from "solid-js";

export const useMediaQuery = (query: string): (() => boolean) => {
    const [matches, setMatches] = createSignal(false);

    createTrackedEffect(() => {
        const mql = globalThis.matchMedia?.(query);
        if (!mql) return;

        setMatches(() => mql.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(() => e.matches);
        mql.addEventListener("change", listener);
        return () => mql.removeEventListener("change", listener);
    });

    return matches;
};
