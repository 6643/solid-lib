import { For } from "solid-js";

import styles from "./SvgIcon.module.css";
import { extractSvgIconPaths } from "./SvgIcon.logic";

export { extractSvgIconPaths } from "./SvgIcon.logic";

export const SvgIcon = (props: { name: string; color?: string; size?: 20 | 24 | 40 | 48 }) => {
    return (
        <svg
            class={styles.SvgIcon}
            viewBox="0 -960 960 960"
            width={props.size ?? 24}
            height={props.size ?? 24}
            style={{ "--color": props.color }}
        >
            <For each={extractSvgIconPaths(props.name)}>{(pathData) => <path d={pathData} />}</For>
        </svg>
    );
};
