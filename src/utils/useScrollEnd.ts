import { type Accessor, createTrackedEffect, getOwner, onCleanup } from "solid-js"
import { createDebounce } from "./createDebounce"

const listenScrollEnd = (el: HTMLElement, hook: (top: number) => void, debounceMs: number) => {
    const debouncedScroll = createDebounce((event: Event) => {
        hook((event.target as HTMLElement).scrollTop);
    }, debounceMs);

    el.addEventListener("scroll", debouncedScroll);
    return () => el.removeEventListener("scroll", debouncedScroll);
};

export const useScrollEnd = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    hook: (top: number) => void,
    debounceMs: number = 32
): VoidFunction | undefined => {
    if (typeof ref !== "function") {
        const cleanup = listenScrollEnd(ref, hook, debounceMs);
        if (getOwner()) onCleanup(cleanup);
        return cleanup;
    }

    createTrackedEffect(() => {
        const el = (ref as Accessor<HTMLElement | undefined>)();
        if (!el) return;
        return listenScrollEnd(el, hook, debounceMs);
    });
}
