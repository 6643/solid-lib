import { type Accessor, createEffect, onCleanup } from "solid-js"

// --- Scroll End Hook ---
export const useScrollEnd = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    hook: (top: number) => void,
    debounceMs: number = 32
) => {
    createEffect(
        () => typeof ref === "function" ? (ref as Accessor<HTMLElement | undefined>)() : ref,  // compute
        (el) => {  // apply
            if (!el) return;

            // Inlined debounce function
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
            onCleanup(() => el.removeEventListener("scroll", debouncedScroll))
        }
    );
}


