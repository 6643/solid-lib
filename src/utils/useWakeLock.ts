import { createSignal, onSettled } from "solid-js";
import { isServer } from "@solidjs/web";

/**
 * A hook to manage the Screen Wake Lock API.
 * It prevents the screen from dimming or locking.
 * @returns An object containing support status, active status signal, and a setter function.
 */
export const useWakeLock = () => {
    const [isSupported] = createSignal(!isServer && "wakeLock" in navigator);
    const [isActive, setIsActive] = createSignal(false);
    let wakeLock: WakeLockSentinel | null = null;

    const request = async () => {
        if (!isSupported() || isActive()) return;
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
        if (isActive() && wakeLock) {
            await wakeLock.release();
        }
    };

    if (!isServer) {
        onSettled(() => {
            const handleVisibilityChange = () => {
                if (isActive() && document.visibilityState === "visible") {
                    void request();
                }
            };
            document.addEventListener("visibilitychange", handleVisibilityChange);
            return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
        });
    }

    const setActive = (active: boolean) => {
        active ? void request() : void release();
    };

    return { isSupportedWakeLock: isSupported, isWakeLockActive: isActive, setWakeLockActive: setActive };
};
