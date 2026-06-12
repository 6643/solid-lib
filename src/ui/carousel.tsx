import styles from "./carousel.module.css";
import { type Component, For } from "solid-js";

export const Carousel = (props: { imgs: string[] }) => {
    // Note: This is a basic visual structure.
    // For full functionality (like sliding), you'd add signals and event handlers.
    return (
        <div class={styles.carousel}>
            <div class={styles.inner}>
                <For each={props.imgs}>
                    {(imgSrc, i) => (
                        <div class={styles.item}>
                            <img src={imgSrc} alt={`Carousel image ${i() + 1}`} />
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};
