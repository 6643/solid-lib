import { createEffect } from "solid-js";

export const useClass = (el: HTMLElement, className: string): void => {
    createEffect(
        () => className,
        (name) => {
            el.classList.add(name);
            return () => el.classList.remove(name);
        },
    );
};
