import { createEffect, getOwner, runWithOwner, type Accessor, type Owner } from "solid-js";
import { createDebounce } from "./createDebounce";
import { readEl } from "./readEl";

const listenScrollEnd = (el: HTMLElement, hook: (top: number) => void, debounceMs: number) => {
    const debouncedScroll = createDebounce((event: Event) => {
        hook((event.target as HTMLElement).scrollTop);
    }, debounceMs);

    el.addEventListener("scroll", debouncedScroll);
    return () => {
        debouncedScroll.cancel();
        el.removeEventListener("scroll", debouncedScroll);
    };
};

export const useScrollEnd = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    hook: (top: number) => void,
    debounceMs: number = 32,
    owner?: Owner | null,
): void => {
    const setup = () =>
        createEffect(
            () => readEl(ref),
            (el) => {
                if (!el) return;
                return listenScrollEnd(el, hook, debounceMs);
            },
        );

    const currentOwner = owner ?? getOwner();
    if (currentOwner) runWithOwner(currentOwner, setup);
    else setup();
};
