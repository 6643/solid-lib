import styles from "./box.module.css"
import { Show } from "solid-js"
export const Block = (props: {
    children: any
    headerTitle?: string
    headerActions?: any
    footerLeft?: string
    footerRight?: any
}) => {

    return <section class={styles.block}>
        <div class={styles.header}>
            <Show when={props.headerTitle}>
                <span>{props.headerTitle}</span>
            </Show>
            <span>{props.headerActions}</span>
        </div>
        <div>
            {props.children}
        </div>
        <Show when={props.footerLeft || props.footerRight}>
            <div class={styles.footer}>
                <span>{props.footerLeft}</span>
                <span>{props.footerRight}</span>
            </div>
        </Show>
    </section>
}