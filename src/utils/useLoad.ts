import { type Accessor, createSignal } from "solid-js"
import { useScrollEnd } from "./useScrollEnd.ts"

const getDistanceToViewportBottom = (el: HTMLElement): number => {
    const rect = el.getBoundingClientRect()
    return rect.top - globalThis.innerHeight
}

export const useLoad = <T>(
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    more: (page: number, args: T) => Promise<boolean>,
    initialArgs: T | Accessor<T>,
    threshold = 320
) => {
    const [getHasMore, setHasMore] = createSignal(true);
    const [getPage, setPage] = createSignal(0);
    const [isLoading, setLoading] = createSignal(false);
    const getArgs = typeof initialArgs === "function" ? (initialArgs as Accessor<T>) : (() => initialArgs) as Accessor<T>;
    const getElement = () => typeof ref === "function" ? ref() : ref;

    const load = async () => {
        const el = getElement();
        if (!getHasMore() || isLoading() || !el) return;
        if (getDistanceToViewportBottom(el) > threshold) return;

        setLoading(true);
        try {
            const hasMoreResult = await more(getPage(), getArgs());
            setHasMore(hasMoreResult);
            if (hasMoreResult) setPage((page) => page + 1);
        } catch (error) {
            console.error("LoadMore error:", error);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        const el = typeof ref === "function" ? ref() : ref;
        if (!el) return;

        setPage(0);
        setHasMore(true);
        setLoading(false);
        if (el.scrollHeight <= el.clientHeight) void load();
    };

    useScrollEnd(ref, load);

    return {
        load,
        reset,
    };
};
