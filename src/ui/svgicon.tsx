import styles from "./svgicon.module.css";

export const SvgIcon = (props: { name: string; color?: string; size?: 20 | 24 | 40 | 48 }) => {
    return (
        <svg
            class={styles.SvgIcon}
            viewBox="0 -960 960 960"
            width={props.size ?? 24}
            height={props.size ?? 24}
            style={{ "--color": props.color }}
            innerHTML={props.name}
        />
    );
};
