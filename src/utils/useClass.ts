import { createTrackedEffect } from "solid-js";
export const useClass = (
    el: HTMLElement,
    className: string
): void => {
    el.classList.add(className);
    createTrackedEffect(() => () => {
        el.classList.remove(className);
    });
};
