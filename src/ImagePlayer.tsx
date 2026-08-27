import styles from "./ImagePlayer.module.css"
import { For } from "solid-js"


export const ImagePlayer = (props: {
    duration?: number
    height?: number
    children: string[]
}) => {
    return <div class={styles.image_player} style={{ "--duration": props.duration, "--height": props.height }}>
        <div>
            <For each={props.children}>{(src) => <img src={src} />}</For>
        </div>
        <div>
            <For each={props.children}>{(src) => <img src={src} />}</For>
        </div>
    </div>
}
