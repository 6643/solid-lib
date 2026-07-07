import { createTrackedEffect } from "solid-js";
import { loadScript } from "../utils/loadScript";
import { loadStyle } from "../utils/loadStyle";
export const Plyr = (props: { src: string }) => {
    const jsState = loadScript("https://cdn.plyr.io/3.8.3/plyr.js")
    loadStyle("https://cdn.plyr.io/3.8.3/plyr.css")

    const init = (videoEl: HTMLVideoElement) => {
        createTrackedEffect(() => {
            if (jsState() !== "loaded") return;
            const player = new (window as any).Plyr(videoEl, { controls: ["play", "progress", "volume"] });
            return () => player.destroy();
        });
    };

    const togglePlay = (e: MouseEvent & { currentTarget: HTMLVideoElement }) => {
        e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause();
    };

    return <video ref={init} src={props.src} onClick={togglePlay} autoplay>
        <track kind="captions" />
    </video>
}
