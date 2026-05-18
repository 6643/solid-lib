import { For } from "solid-js";

import styles from "./SvgIcon.module.css";

const PATH_TAG_PATTERN = /<path\s+([^>]*)\s*(?:\/>|>\s*<\/path>)/g;
const PATH_D_ATTRIBUTE_PATTERN = /^d=(["'])([\s\S]*?)\1$/;
const SVG_PATH_DATA_PATTERN = /^[MmZzLlHhVvCcSsQqTtAa0-9,.\-\s]+$/;

export const extractSvgIconPaths = (source: string): string[] => {
    const paths: string[] = [];
    const withoutPathTags = source
        .replace(PATH_TAG_PATTERN, (_, attributes: string) => {
            const normalizedAttributes = attributes.trim().replace(/\/$/, "").trim();
            const match = normalizedAttributes.match(PATH_D_ATTRIBUTE_PATTERN);
            const pathData = match?.[2];

            if (pathData && SVG_PATH_DATA_PATTERN.test(pathData)) {
                paths.push(pathData);
            }

            return "";
        })
        .trim();

    return withoutPathTags.length === 0 ? paths : [];
};

export const SvgIcon = (props: { name: string; color?: string; size?: 20 | 24 | 40 | 48 }) => {
    return (
        <svg
            class={styles.SvgIcon}
            viewBox="0 -960 960 960"
            width={props.size ?? 24}
            height={props.size ?? 24}
            style={{ "--color": props.color }}
        >
            <For each={extractSvgIconPaths(props.name)}>{(pathData) => <path d={pathData()} />}</For>
        </svg>
    );
};
