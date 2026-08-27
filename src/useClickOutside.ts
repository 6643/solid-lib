import { createEffect, type Accessor } from "solid-js";

export const useClickOutside = (
    ref: Accessor<Element | undefined>,
    handler: () => void,
    options?: { enabled?: Accessor<boolean> },
) => {
    createEffect(
        () => {
            const el = ref();
            const isEnabled = options?.enabled === undefined || options.enabled();
            return { el, isEnabled };
        },
        ({ el, isEnabled }) => {
            if (!isEnabled || !el) return;

            const onClick = (e: MouseEvent) => {
                if (!el.contains(e.target as Node)) {
                    handler();
                }
            };

            document.body.addEventListener("mousedown", onClick);
            return () => document.body.removeEventListener("mousedown", onClick);
        },
    );
};
