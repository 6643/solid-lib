import { onCleanup, createEffect, type Accessor } from "solid-js";

export const useClickOutside = (
    ref: Accessor<Element | undefined>,
    handler: () => void,
    options?: { enabled?: Accessor<boolean> }
) => {
    createEffect(
        () => ({ ref: ref(), enabled: options?.enabled === undefined || options.enabled() }),  // compute
        ({ ref: el, enabled: isEnabled }) => {  // apply
            if (!isEnabled) return;
            if (!el) return;

            const onClick = (e: MouseEvent) => {
                if (el && !el.contains(e.target as Node)) {
                    handler();
                }
            };

            document.body.addEventListener("mousedown", onClick);

            onCleanup(() => document.body.removeEventListener("mousedown", onClick));
        }
    );
};