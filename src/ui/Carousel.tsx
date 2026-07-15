import styles from "./Carousel.module.css";
import { createSignal, createEffect, For, untrack } from "solid-js";

export const Carousel = (props: {
    imgs: string[];
    index?: number;
    changed?: (index: number) => void;
    class?: string;
}) => {
    const [getIndex, setIndex] = createSignal(untrack(() => props.index) ?? 0);

    createEffect(
        () => props.index,
        (index) => {
            if (typeof index === "number") setIndex(index);
        },
    );

    createEffect(
        () => props.imgs.length,
        (len) => {
            if (len <= 0) {
                setIndex(0);
                return;
            }
            if (getIndex() >= len) setIndex(len - 1);
        },
    );

    const go = (next: number) => {
        const len = props.imgs.length;
        if (len <= 0) return;
        const clamped = ((next % len) + len) % len;
        setIndex(clamped);
        props.changed?.(clamped);
    };

    return (
        <div class={[styles.carousel, props.class]}>
            <div class={styles.inner} style={{ transform: `translateX(-${getIndex() * 100}%)` }}>
                <For each={props.imgs}>
                    {(imgSrc, i) => (
                        <div class={styles.item}>
                            <img src={imgSrc} alt={`Carousel image ${i() + 1}`} />
                        </div>
                    )}
                </For>
            </div>
            <button type="button" class={styles.prev} aria-label="Previous" onClick={() => go(getIndex() - 1)}>
                ‹
            </button>
            <button type="button" class={styles.next} aria-label="Next" onClick={() => go(getIndex() + 1)}>
                ›
            </button>
        </div>
    );
};
