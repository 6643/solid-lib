import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js"
import { useScrollEnd } from "./useScrollEnd.ts"

// Helper function for distance calculation
const getDistanceToViewportBottom = (el: HTMLElement): number => {
    const rect = el.getBoundingClientRect()
    return rect.bottom - globalThis.innerHeight
}

// The single functional useLoad hook
export const useLoad = <T>(
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    more: (page: number, args: T) => Promise<boolean>,
    initialArgs: T | Accessor<T>,
    threshold = 320
) => {
    createEffect(
        () => typeof ref === "function" ? ref() : ref,  // compute
        (el) => {  // apply
            if (!el) return;

            // Inlined core logic from createLoadHandler
            const [getHasMore, setHasMore] = createSignal(true);
            const [getPage, setPage] = createSignal(0);
            const [isLoading, setLoading] = createSignal(false);

            const getArgs = typeof initialArgs === "function" ? (initialArgs as Accessor<T>) : (() => initialArgs) as Accessor<T>;

            const loadData = async () => {
                if (!getHasMore() || isLoading() || !el) return;
                if (getDistanceToViewportBottom(el) > threshold) return;

                setLoading(true);
                try {
                    const hasMoreResult = await more(getPage(), getArgs());
                    setHasMore(hasMoreResult);
                    if (hasMoreResult) setPage(p => p + 1);
                } catch (error) {
                    console.error("LoadMore error:", error);
                } finally {
                    setLoading(false);
                }
            };

            const reset = () => {
                setPage(0);
                setHasMore(true);
                setLoading(false);
                if (el && el.scrollHeight <= el.clientHeight) loadData();
            };


            useScrollEnd(() => el, loadData);

            // Return the controls
            return {
                reset,
                getHasMore,
                getPage,
                isLoading
            };
        }
    );
};
