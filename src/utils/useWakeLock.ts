import { createSignal, createTrackedEffect } from 'solid-js';

/**
 * A hook to manage the Screen Wake Lock API.
 * It prevents the screen from dimming or locking.
 * @returns An object containing support status, active status signal, and a setter function.
 */
export const useWakeLock = () => {
    const [isSupported] = createSignal('wakeLock' in navigator);
    const [isActive, setIsActive] = createSignal(false);
    let wakeLock: WakeLockSentinel | null = null;

    const request = async () => {
        if (!isSupported() || isActive()) return;
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            setIsActive(true);
            console.log('Screen Wake Lock is active.');
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock was released.');
                setIsActive(false);
                wakeLock = null; // Sentinel is released, clear our reference
            });
        } catch (err: any) {
            console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
            setIsActive(false);
            wakeLock = null;
        }
    };

    const release = async () => {
        if (isActive() && wakeLock) {
            await wakeLock.release();
            // The 'release' event listener will handle setting isActive to false.
        }
    };

    // Automatically re-acquire the lock when the page becomes visible again
    createTrackedEffect(() => {
        const visibilityState = document.visibilityState;
        const handleVisibilityChange = () => {
            if (isActive() && visibilityState === 'visible') {
                request();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    const setActive = (active: boolean) => {
        active ? request() : release();
    };

    return { isSupportedWakeLock: isSupported, isWakeLockActive: isActive, setWakeLockActive: setActive };
};
