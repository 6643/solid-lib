import { createEffect } from "solid-js";
import { loadScript } from "../utils/loadScript";
import { loadStyle } from "../utils/loadStyle";

export const Plyr = (props: { src: string }) => {
    const jsState = loadScript("https://cdn.plyr.io/3.8.3/plyr.js");
    loadStyle("https://cdn.plyr.io/3.8.3/plyr.css");

    const init = (videoEl: HTMLVideoElement) => {
        createEffect(
            () => jsState(),
            (state) => {
                if (state !== "loaded") return;
                const PlyrCtor = (window as unknown as { Plyr: new (el: HTMLVideoElement, opts: object) => { destroy: () => void } }).Plyr;
                const player = new PlyrCtor(videoEl, { controls: ["play", "progress", "volume"] });
                return () => player.destroy();
            },
        );
    };

    const togglePlay = (e: MouseEvent & { currentTarget: HTMLVideoElement }) => {
        e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause();
    };

    return (
        <video ref={init} src={props.src} onClick={togglePlay} autoplay>
            <track kind="captions" />
        </video>
    );
};
