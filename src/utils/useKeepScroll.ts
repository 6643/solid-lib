import { type Accessor, createEffect, createStore, getOwner, runWithOwner, untrack, type Owner } from "solid-js";
import { readEl } from "./readEl";
import { useScrollEnd } from "./useScrollEnd.ts";

interface ScrollPositionsStore {
    [page: string]: {
        [key: string]: number;
    };
}

const [scrollPos, setScrollPos] = createStore<ScrollPositionsStore>({});

export const setPos = (page: string, key: string, value: number) =>
    setScrollPos((store) => {
        // Solid 2.0: store setters are draft-first; mutate in place (no return).
        if (!store[page]) store[page] = {};
        store[page][key] = value;
    });

export const getPos = (page: string, key: string): number => untrack(() => scrollPos[page]?.[key] ?? 0);

export const delPos = (page: string) =>
    setScrollPos((store) => {
        delete store[page];
    });

export const useKeepScroll = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    page: string,
    key: string,
    debounceMs: number = 32,
    owner?: Owner | null,
) => {
    const restoreScrollTop = (el: HTMLElement) => {
        const storedTop = getPos(page, key);
        if (storedTop <= 0) return;

        const timer = setTimeout(() => {
            el.scrollTop = storedTop;
        }, 0);

        return () => clearTimeout(timer);
    };

    useScrollEnd(ref, (top) => setPos(page, key, top), debounceMs, owner);

    const setup = () =>
        createEffect(
            () => readEl(ref),
            (el) => {
                if (!el) return;
                return restoreScrollTop(el);
            },
        );

    const currentOwner = owner ?? getOwner();
    if (currentOwner) runWithOwner(currentOwner, setup);
    else setup();
};
