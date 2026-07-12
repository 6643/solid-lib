import { createEffect, type Accessor } from "solid-js";
import { createDebounce } from "./createDebounce";

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
    debounceMs: number = 32,
): void => {
    createEffect(
        () => (typeof ref === "function" ? ref() : ref),
        (el) => {
            if (!el) return;
            return listenScrollEnd(el, hook, debounceMs);
        },
    );
};
