import { createEffect, type Accessor } from "solid-js";
import { isServer } from "@solidjs/web";

/**
 * A reactive hook that listens for key presses on the window.
 * @param key - The key or keys to listen for.
 * @param callback - The function to call when the key is pressed.
 * @param options - Options to control the listener, such as `enabled` and `capture`.
 */
export function useKeyPress(
    key: string | string[] | Accessor<string | string[]>,
    callback: (e: KeyboardEvent) => void,
    options: { enabled?: boolean | Accessor<boolean>; capture?: boolean } = { enabled: true },
) {
    if (isServer) return;

    const readKeys = () => {
        const value = typeof key === "function" ? key() : key;
        return Array.isArray(value) ? value : [value];
    };

    const readEnabled = () => {
        const enabled = options.enabled;
        if (typeof enabled === "function") return enabled();
        return enabled !== false;
    };

    createEffect(
        () => ({ keys: readKeys(), enabled: readEnabled(), capture: options.capture }),
        ({ keys, enabled, capture }) => {
            if (!enabled) return;

            const handleKeyDown = (e: KeyboardEvent) => {
                if (keys.includes(e.key)) callback(e);
            };

            window.addEventListener("keydown", handleKeyDown, { capture });
            return () => window.removeEventListener("keydown", handleKeyDown, { capture });
        },
    );
}
