import { onSettled } from "solid-js";
export const useClass = (
    el: HTMLElement,
    className: string
): void => {
    el.classList.add(className);
    onSettled(() => {
        el.classList.remove(className);
    });
};
