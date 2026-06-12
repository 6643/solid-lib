import { type Accessor, createEffect } from "solid-js"

// --- Scroll End Hook ---
export const useScrollEnd = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    hook: (top: number) => void,
    debounceMs: number = 32
) => {
    createEffect(
        () => typeof ref === "function" ? (ref as Accessor<HTMLElement | undefined>)() : ref,
        (el) => {
            if (!el) return;

            const debounce = <A extends unknown[]>(
                f: (...args: A) => void,
                ms: number,
            ): ((...args: A) => void) => {
                let timer: ReturnType<typeof setTimeout>
                return (...args: A) => {
                    clearTimeout(timer)
                    timer = setTimeout(() => f(...args), ms)
                }
            }

            const debouncedScroll = debounce((event: Event) => {
                const targetEl = (event.target as HTMLElement)
                hook(targetEl.scrollTop)
            }, debounceMs)

            el.addEventListener("scroll", debouncedScroll)
            return () => el.removeEventListener("scroll", debouncedScroll)
        }
    );
}


