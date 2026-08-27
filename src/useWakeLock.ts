import { createSignal, onSettled } from "solid-js";
import { isServer } from "@solidjs/web";

/**
 * Screen Wake Lock with separate desired vs actual state.
 * Solid 2.0: setup/teardown via onSettled + returned cleanup.
 * `desired` is a plain flag so intent is visible before microtask flush.
 */
export const useWakeLock = () => {
    const [isSupported] = createSignal(!isServer && typeof navigator !== "undefined" && "wakeLock" in navigator);
    /** User/app intent — not a signal, so setActive can request before flush. */
    let desired = false;
    const [isActive, setIsActive] = createSignal(false);
    let wakeLock: WakeLockSentinel | null = null;

    const request = async () => {
        if (!isSupported() || !desired) return;
        if (wakeLock && !wakeLock.released) return;
        try {
            wakeLock = await navigator.wakeLock.request("screen");
            setIsActive(true);
            wakeLock.addEventListener("release", () => {
                setIsActive(false);
                wakeLock = null;
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? `${err.name}, ${err.message}` : String(err);
            console.error(`Wake Lock request failed: ${message}`);
            setIsActive(false);
            wakeLock = null;
        }
    };

    const release = async () => {
        if (wakeLock) {
            try {
                await wakeLock.release();
            } catch {
                // ignore double-release
            }
            wakeLock = null;
        }
        setIsActive(false);
    };

    if (!isServer) {
        onSettled(() => {
            const handleVisibilityChange = () => {
                if (desired && document.visibilityState === "visible") {
                    void request();
                }
            };
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                desired = false;
                void release();
            };
        });
    }

    const setActive = (active: boolean) => {
        desired = active;
        if (active) void request();
        else void release();
    };

    return {
        isSupportedWakeLock: isSupported,
        isWakeLockActive: isActive,
        setWakeLockActive: setActive,
    };
};
