import { type Accessor, createStore, createTrackedEffect, getOwner, onCleanup, untrack } from "solid-js"
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
    const restoreScrollTop = (el: HTMLElement) => {
        const storedTop = getPos(page, key);
        if (storedTop <= 0) return;

        const timer = setTimeout(() => {
            el.scrollTop = storedTop;
        }, 0);

        return () => clearTimeout(timer);
    };

    if (typeof ref !== "function") {
        useScrollEnd(ref, (top) => setPos(page, key, top), debounceMs);
        const cleanup = restoreScrollTop(ref);
        if (cleanup && getOwner()) onCleanup(cleanup);
        return;
    }

    createTrackedEffect(() => {
        const el = ref();
        if (!el) return;
        useScrollEnd(el, (top) => setPos(page, key, top), debounceMs);
        return restoreScrollTop(el);
    });
};
