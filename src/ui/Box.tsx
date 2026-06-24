import styles from "./Box.module.css";
import { Show } from "solid-js";
import type { JSX } from "@solidjs/web";

export const Block = (props: {
    children: JSX.Element;
    headerTitle?: string;
    headerActions?: JSX.Element;
    footerLeft?: string;
    footerRight?: JSX.Element;
}) => {
    return (
        <section class={styles.block}>
            <div class={styles.header}>
                <Show when={props.headerTitle}>
                    <span>{props.headerTitle}</span>
                </Show>
                <span>{props.headerActions}</span>
            </div>
            <div>{props.children}</div>
            <Show when={props.footerLeft || props.footerRight}>
                <div class={styles.footer}>
                    <span>{props.footerLeft}</span>
                    <span>{props.footerRight}</span>
                </div>
            </Show>
        </section>
    );
};
