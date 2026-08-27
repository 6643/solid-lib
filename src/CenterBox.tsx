import styles from "./CenterBox.module.css";
import type { Element } from "solid-js";

export const CenterBox = (props: {
    children: Element;
    w?: number;
    h?: number;
}) => {
    return (
        <div class={styles.centerBox} style={{ "--w": props.w, "--h": props.h }}>
            {props.children}
        </div>
    );
};
