import { createSignal, onCleanup } from "solid-js"

export const useMediaQuery = (query: string): (() => boolean) => {
    const [matches, setMatches] = createSignal(false)

    const mql = globalThis.matchMedia?.(query)
    if (mql) {
        setMatches(mql.matches)

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
        mql.addEventListener("change", listener)
        onCleanup(() => mql.removeEventListener("change", listener))
    }

    return matches
}
