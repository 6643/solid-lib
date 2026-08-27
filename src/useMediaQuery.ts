import { createEffect, createSignal } from "solid-js";
import { isServer } from "@solidjs/web";

export const useMediaQuery = (query: string): (() => boolean) => {
    const [matches, setMatches] = createSignal(false);

    if (isServer) return matches;

    createEffect(
        () => query,
        (currentQuery) => {
            const mql = globalThis.matchMedia?.(currentQuery);
            if (!mql) return;

            setMatches(() => mql.matches);

            const listener = (e: MediaQueryListEvent) => setMatches(() => e.matches);
            mql.addEventListener("change", listener);
            return () => mql.removeEventListener("change", listener);
        },
    );

    return matches;
};
