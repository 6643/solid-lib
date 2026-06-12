import styles from "./centerbox.module.css";
export const CenterBox = (props: {
    children: any
    w?: number
    h?: number
}) => {
    return <div class={styles.CenterBox} style={{ "--w": props.w, "--h": props.h }}>
        {props.children}
    </div>
}
