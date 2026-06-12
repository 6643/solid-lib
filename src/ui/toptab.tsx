import styles from "./toptab.module.css"
import { createSignal, For, onSettled, Show } from "solid-js"
import { getPos, useKeepScroll, setPos } from "../use/useKeepScroll.ts"

export const TopTab = (props: {
    mode?: "all" | "part" | "memu",
    children: { name: string, panel: () => any }[]
}) => {
    const key = "tab.tab"
    const getTabIndexKey = () => key
    const getTabScrollKey = (index: number = -1) => (index === -1 ? key : `${key}.${index}`)

    const mode = props.mode ?? "all"

    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, getTabIndexKey()))
    const [isToLeft, setToLeft] = createSignal(false)


    const [getLeft, setLeft] = createSignal(0)
    const [getWidth, setWidth] = createSignal(0)

    let el: HTMLElement | undefined
    const toIndex = (index: number) => {
        if (!el) return
        const child = el.children[index] as HTMLElement
        child.scrollIntoView({ behavior: "smooth", inline: "center" })
        setPos(location.pathname, getTabIndexKey(), index)

        setLeft(child.offsetLeft)
        setWidth(child.offsetWidth)
        setToLeft(index > getActiveIndex())
        setActiveIndex(index)
    }
    onSettled(() => toIndex(getActiveIndex()))



    return <div class={styles.top_tab} part={mode}>
        <nav ref={el} style={{ "--left": getLeft(), "--width": getWidth() }}>
            <For each={props.children}>{({ name }, index) =>
                <div onClick={() => toIndex(index())} class={index() == getActiveIndex() ? styles.active! : ""}>
                    {name}
                </div>
            }</For>
        </nav>

        <For each={props.children}>{({ panel }, index) =>
            <Show when={index() == getActiveIndex()}>
                <main ref={(el: HTMLElement) => useKeepScroll(el, location.pathname, getTabScrollKey(index()))} class={isToLeft() ? styles.moveRight : styles.moveLeft}>
                    {panel()}
                </main>
            </Show>
        }</For>
    </div>
}
