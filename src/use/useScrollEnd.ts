import { type Accessor, createEffect } from "solid-js"
import { createDebounce } from "./createDebounce"

export const useScrollEnd = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    hook: (top: number) => void,
    debounceMs: number = 32
) => {
    createEffect(
        () => typeof ref === "function" ? (ref as Accessor<HTMLElement | undefined>)() : ref,
        (el) => {
            if (!el) return;

            const debouncedScroll = createDebounce((event: Event) => {
                hook((event.target as HTMLElement).scrollTop)
            }, debounceMs)

            el.addEventListener("scroll", debouncedScroll)
            return () => el.removeEventListener("scroll", debouncedScroll)
        }
    );
}
