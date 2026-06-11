import { type Accessor, createEffect, createStore } from "solid-js"
import { useScrollEnd } from "./useScrollEnd.ts"


interface ScrollPositionsStore {
    [page: string]: {
        [key: string]: number
    }
}

// Create the store
const [scrollPos, setScrollOs] = createStore<ScrollPositionsStore>({})


export const setPos = (page: string, key: string, value: number) => setScrollOs(store => {
    if (!store[page]) store[page] = {}
    store[page][key] = value
    return store
})


export const getPos = (page: string, key: string): number => scrollPos[page]?.[key] ?? 0

export const delPos = (page: string) => setScrollOs(store => { delete store[page]; return store })

// --- Keep Scroll Hook ---
export const useKeepScroll = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    page: string,
    key: string,
    debounceMs: number = 32
) => {
    createEffect(
        () => typeof ref === "function" ? (ref as Accessor<HTMLElement | undefined>)() : ref,  // compute
        (el) => {  // apply
            if (!el) return;

            // Inlined core logic from createKeepScrollHandler
            useScrollEnd(() => el, (top) => setPos(page, key, top), debounceMs) // Now calls the new useScrollEnd

            createEffect(
                () => getPos(page, key),  // compute
                (storedTop) => {  // apply
                    if (storedTop > 0) setTimeout(() => {
                        if (el) el.scrollTop = storedTop
                    }, 0)
                }
            )
        }
    );
}
