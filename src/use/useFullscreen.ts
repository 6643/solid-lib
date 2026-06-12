import { createSignal, onSettled } from "solid-js";

/**
 * A hook that provides a function to toggle full screen mode for the document element.
 * @returns An object containing the current fullscreen state signal and a toggle function.
 */
export const useFullScreen = () => {
    const [isFullscreen, setIsFullscreen] = createSignal(!!document.fullscreenElement);

    const handleFullScreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    onSettled(() => {
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    });

    const toggleFullScreen = () => {
        if (!isFullscreen()) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    };

    return { isFullscreen, setIsFullscreen, toggleFullScreen };
};