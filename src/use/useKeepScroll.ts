import { type Accessor, createEffect, createRoot, createStore, untrack } from "solid-js"
import { useScrollEnd } from "./useScrollEnd.ts"


interface ScrollPositionsStore {
    [page: string]: {
        [key: string]: number
    }
}

const [scrollPos, setScrollPos] = createStore<ScrollPositionsStore>({});

export const setPos = (page: string, key: string, value: number) =>
    setScrollPos((store) => {
        if (!store[page]) store[page] = {};
        store[page][key] = value;
        return store;
    });

export const getPos = (page: string, key: string): number => untrack(() => scrollPos[page]?.[key] ?? 0);

export const delPos = (page: string) =>
    setScrollPos((store) => {
        delete store[page];
        return store;
    });

// --- Keep Scroll Hook ---
export const useKeepScroll = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    page: string,
    key: string,
    debounceMs: number = 32,
) => {
    const el = typeof ref === "function" ? ref() : ref;
    if (!el) return;

    createRoot((dispose) => {
        useScrollEnd(el, (top) => setPos(page, key, top), debounceMs);

        createEffect(() => getPos(page, key), (storedTop) => {
            if (storedTop <= 0) return;

            const timer = setTimeout(() => {
                el.scrollTop = storedTop;
            }, 0);

            return () => clearTimeout(timer);
        });

        return dispose;
    });
};
