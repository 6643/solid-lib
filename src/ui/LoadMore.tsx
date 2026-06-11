import { onSettled, createSignal } from "solid-js"
import { useScrollEnd } from "./useScrollEnd.ts"


export const LoadMore = <T,>(
    api: (page: number, args?: T) => Promise<boolean>,
    args?: T,
    threshold?: number,
) => {
    const _threshold = threshold ?? 320

    const [getHasMore, setHasMore] = createSignal(true)
    const [getPage, setPage] = createSignal(0)
    const [isLoading, setLoading] = createSignal(false)

    let el: HTMLDivElement | undefined

    const load = async () => {
        if (!getHasMore() || isLoading() || !el || getToVisBottom(el) > _threshold) return
        setLoading(true)
        try {
            const hasMore = await api(getPage(), args)
            setHasMore(hasMore)
            if (hasMore) setPage(p => p + 1)
        } catch (error) {
            console.error("LoadMore: ", error)
        } finally {
            setLoading(false)
        }
    }

    onSettled(() => {
        if (!el) return
        useScrollEnd(el, load)
        // if (get_has_more() && !is_loading() && el.scrollHeight <= el.clientHeight) load()
    })

    const reset = () => {
        setPage(0)
        setHasMore(true)
        setLoading(false)
        if (el && el.scrollHeight <= el.clientHeight) load()
    }

    return {
        reset,
        LoadMore: <span ref={el}></span>
    }
}

const getToVisBottom = (el: HTMLElement): number => {
    const rect = el.getBoundingClientRect()
    return rect.top - globalThis.innerHeight
}
