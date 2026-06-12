import { onCleanup } from "solid-js";
export const useClass = (
    el: HTMLElement,
    className: string
): void => {
    el.classList.add(className);
    onCleanup(() => {
        el.classList.remove(className);
    });
};
