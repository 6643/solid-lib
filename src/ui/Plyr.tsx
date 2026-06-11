import { createEffect, onCleanup } from "solid-js";
import { loadScript } from "./loadScript.ts";
import { loadStyle } from "./loadStyle.ts";
export const Plyr = (props: { src: string }) => {
    const jsState = loadScript("https://cdn.plyr.io/3.8.3/plyr.js")
    loadStyle("https://cdn.plyr.io/3.8.3/plyr.css")

    const init = (videoEl: HTMLVideoElement) => {
        createEffect(
            () => jsState() == "loaded",  // compute
            (loaded) => {  // apply
                if (loaded) {
                    const player = new (window as any).Plyr(videoEl, { controls: ["play", "progress", "volume"] });
                    onCleanup(() => player.destroy())
                }
            }
        )
    };

    const togglePlay = (e: MouseEvent & { currentTarget: HTMLVideoElement }) => {
        e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause();
    };

    return <video ref={init} src={props.src} onClick={togglePlay} autoplay>
        <track kind="captions" />
    </video>
}
