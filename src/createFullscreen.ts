import { createSignal, onSettled } from "solid-js";
import { isServer } from "@solidjs/web";

/**
 * A hook that provides a function to toggle full screen mode for the document element.
 * @returns An object containing the current fullscreen state signal and a toggle function.
 */
export const createFullscreen = () => {
    const [isFullscreen, setIsFullscreen] = createSignal(
        !isServer && !!globalThis.document?.fullscreenElement,
    );

    if (!isServer) {
        onSettled(() => {
            const handleFullScreenChange = () => setIsFullscreen(!!document.fullscreenElement);
            document.addEventListener("fullscreenchange", handleFullScreenChange);
            return () => document.removeEventListener("fullscreenchange", handleFullScreenChange);
        });
    }

    const toggleFullScreen = () => {
        if (isServer) return;
        if (!isFullscreen()) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    return { isFullscreen, setIsFullscreen, toggleFullScreen };
};
