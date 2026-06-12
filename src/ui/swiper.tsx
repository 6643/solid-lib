import styles from "./swiper.module.css"

import { children, createMemo, onSettled, omit } from "solid-js"
import type { JSX } from "@solidjs/web"
import { Dynamic, For } from "@solidjs/web"
import { loadScript } from "./loadscript.ts"

export const Swiper = <T,>(props: {
    children: JSX.Element | JSX.Element[]
    [key: string]: any
}) => {
    loadScript("https://unpkg.com/swiper/swiper-element-bundle.min.js")

    const otherProps = omit(props, "items", "children");

    const init = (swiperEl: HTMLElement) => {
        Object.entries(otherProps).forEach(([key, value]) => swiperEl.setAttribute(key, String(value)));

        let swiper: any, slideChangeHandler: () => void, autoplayController: () => void, allVideos: HTMLVideoElement[];

        customElements.whenDefined("swiper-container").then(() => {
            swiper = (swiperEl as any).swiper;
            autoplayController = () => checkVideoStatusAndControlAutoplay(swiper);

            allVideos = swiper.slides.flatMap(
                (slide: HTMLElement) => Array.from(slide.querySelectorAll("video")) as HTMLVideoElement[],
            );

            allVideos.forEach((video: HTMLVideoElement) => {
                video.addEventListener("play", autoplayController);
                video.addEventListener("pause", autoplayController);
                video.addEventListener("ended", autoplayController);
                video.addEventListener("canplay", autoplayController);
                video.addEventListener("canplaythrough", autoplayController);
            });

            slideChangeHandler = () => {
                checkVideoStatusAndControlAutoplay(swiper);
                pauseInvisibleVideos(swiper);
            };

            swiper.on("transitionEnd", slideChangeHandler);
            swiper.on("slideChange", slideChangeHandler);

            slideChangeHandler();
        });

        onSettled(() => {
            if (!swiper) return;
            allVideos.forEach((video: HTMLVideoElement) => {
                video.removeEventListener("play", autoplayController);
                video.removeEventListener("pause", autoplayController);
                video.removeEventListener("ended", autoplayController);
                video.removeEventListener("canplay", autoplayController);
                video.removeEventListener("canplaythrough", autoplayController);
            });
            swiper.off("transitionEnd", slideChangeHandler);
            swiper.off("slideChange", slideChangeHandler);
        })
    };


    const resolved = children(() => props.children);
    const resolvedArray = createMemo(() => {
        const resolveChildren = resolved();
        return (Array.isArray(resolveChildren) ? resolveChildren : [resolveChildren]).flat().filter(c => c != null);
    });
    return <Dynamic component="swiper-container" class={styles.swiper} ref={init}>
        <For each={resolvedArray()}>{(child) =>
            <Dynamic component="swiper-slide">{child}</Dynamic>
        }</For>
    </Dynamic>
}



const checkVideoStatusAndControlAutoplay = (swiper: any): void => {
    if (!swiper?.params.autoplay?.enabled) return;

    const allVisibleVideos: HTMLVideoElement[] = swiper.slides
        .filter((slide: HTMLElement) => slide.classList.contains("swiper-slide-visible"))
        .flatMap((slide: HTMLElement) => Array.from(slide.querySelectorAll("video") as NodeListOf<HTMLVideoElement>));

    const isAnyVideoPlaying: boolean = allVisibleVideos.some((video) => !video.paused && !video.ended);

    if (isAnyVideoPlaying) {
        if (!swiper.autoplay.running) {
            return;
        }
        swiper.autoplay.stop();
        return;
    }

    if (swiper.autoplay.running) {
        return;
    }
    swiper.autoplay.start();
};

const pauseInvisibleVideos = (swiper: any): void => {
    if (!swiper?.slides) return;

    swiper.slides.forEach((slide: HTMLElement) => {
        if (slide.classList.contains("swiper-slide-visible")) return;

        const videosToPause = slide.querySelectorAll("video");
        if (videosToPause.length === 0) return;

        videosToPause.forEach((videoEl) => {
            if (videoEl.paused) return;

            videoEl.pause();
        });
    });
};
