import styles from "./CenterBox.module.css";
export const CenterBox = (props: {
    children: any
    w?: number
    h?: number
}) => {
    return <div class={styles.centerBox} style={{ "--w": props.w, "--h": props.h }}>
        {props.children}
    </div>
}
