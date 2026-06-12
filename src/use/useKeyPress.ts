import { createEffect } from "solid-js";
import { isServer } from "@solidjs/web";

/**
 * A reactive hook that listens for key presses on the window.
 * @param key - The key or keys to listen for.
 * @param callback - The function to call when the key is pressed.
 * @param options - Options to control the listener, such as `enabled` and `capture`.
 */
export function useKeyPress(
  key: string | string[],
  callback: (e: KeyboardEvent) => void,
  options: { enabled?: boolean, capture?: boolean } = { enabled: true }
) {
  if (isServer) return;

  const keys = Array.isArray(key) ? key : [key];

  createEffect(
    () => options.enabled,  // compute
    (enabled) => {  // apply
      // If the hook is disabled, do nothing.
      if (enabled === false) {
        return;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (keys.includes(e.key)) {
          callback(e);
        }
      };

      window.addEventListener("keydown", handleKeyDown, { capture: options.capture });

      return () => {
        window.removeEventListener("keydown", handleKeyDown, { capture: options.capture });
      };
    }
  );
}