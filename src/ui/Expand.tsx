import styles from "./Expand.module.css"
import { createSignal, Show, createEffect } from "solid-js"
import { SvgIcon, icon_chevron_right } from "./SvgIcon"

export const Expand = (props: {
    title: string
    children: any
    group?: string
}) => {
    const [getVis, setVis] = createSignal(false)
    const [isActive, setActive] = createSignal(false)

    createEffect(
        () => getVis(),
        (value) => {
            if (value) { setActive(true); return }
            const timer = setTimeout(() => setActive(() => false), 400)
            return () => clearTimeout(timer)
        }
    )

    const toggle = () => setVis(!getVis())

    return <div class={`${styles.expand} ${getVis() ? styles.active! : ""}`}>
        <nav onClick={toggle}>
            <span>{props.title}</span>
            <SvgIcon name={icon_chevron_right} />
        </nav>
        <Show when={isActive()}>
            <main>{props.children}</main>
        </Show>
    </div>
}
