import styles from "./lefttab.module.css"
import { createSignal, For, Match, onSettled, Show, Switch } from "solid-js"
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll"
import { useDebounce } from "../use/useDebounce"

export const LeftTab = (props: {
    mode?: "all" | "part" | "memu",
    children: { name: string, panel: () => any }[]
}) => {
    const key = "left.tab"
    const getTabIndexKey = () => key
    const getTabScrollKey = (index: number = -1) => (index === -1 ? key : `${key}.${index}`)


    const mode = props.mode ?? "all"

    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, getTabIndexKey()))
    const [isToUp, setToUp] = createSignal(false)


    const [getActives, setActives] = createSignal<boolean[]>([])
    const [getTop, setTop] = createSignal(0)
    const [getHeight, setHeight] = createSignal(mode == "all" ? 64 : 0)


    let el: HTMLElement | undefined
    const toIndex = (index: number) => {
        if (!el) return
        el.firstElementChild!.children[index]!.scrollIntoView({ behavior: "smooth", block: "center" })
        if (mode == "all") {
            setTop(68 * index)
            setToUp(index > getActiveIndex())
        } else if (mode == "part") {
            (el.lastElementChild! as HTMLElement).children[index]!.scrollIntoView()
            computed(el.lastElementChild! as HTMLElement)
        }
        setActiveIndex(index)
        setPos(location.pathname, getTabIndexKey(), index)
    }

    const computed = (ele: HTMLElement) => {
        const childsVis = getChildsVis(ele)
        const ratios = childsVis.reduce((a, b) => a + b)
        if (ratios == 0) return

        setActives(childsVis.map(e => e > 0))
        setTop(68 * childsVis.findIndex(e => e > 0))
        setHeight(ratios * 64 + (Math.ceil(ratios) - 1) * 4)
    }

    const scrollEnd = useDebounce((e: Event) => {
        if (mode == "part") computed(e.target as HTMLElement)
    }, 32)


    const getChildsVis = (boxEl: HTMLElement): number[] => {
        const containerRect = boxEl.getBoundingClientRect()
        const containerY = containerRect.y
        const containerHeight = containerRect.height
        const children = Array.from(boxEl.children)

        const vis: number[] = new Array(children.length).fill(0)


        children.forEach((child, index) => {
            const childRect = child.getBoundingClientRect()
            const childHeight = childRect.height
            if (childHeight === 0) return

            const childTopInContainer = childRect.y - containerY
            const childBottomInContainer = childRect.bottom - containerY

            const visibleChildTop = Math.max(childTopInContainer, 0)
            const visibleChildBottom = Math.min(childBottomInContainer, containerHeight)

            const visiblePixelHeight = Math.max(0, visibleChildBottom - visibleChildTop)

            const ratio = visiblePixelHeight / childHeight
            vis[index] = ratio
        })

        return vis
    }

    onSettled(() => toIndex(getActiveIndex()))


    return <div ref={(ele: HTMLElement) => el = ele} class={styles.leftTab} part={mode} >
        <nav style={{ "--top": getTop(), "--height": getHeight() }}>
            <For each={props.children}>{({ name }, index) =>
                <div onClick={() => toIndex(index())} class={index() == getActiveIndex() ? styles.active! : ""}>
                    {name}
                </div>
            }</For>
        </nav>


        <Switch>
            <Match when={mode == "all"}>
                <For each={props.children}>{({ panel }, index) =>
                    <Show when={index() == getActiveIndex()}>
                        <main ref={(el: HTMLElement) => useKeepScroll(el, location.pathname, getTabScrollKey(index()))} class={isToUp() ? styles.moveUp : styles.moveDown}>{panel()}</main>
                    </Show>
                }</For>
            </Match>

            <Match when={mode == "part"}>
                <main ref={(el: HTMLElement) => useKeepScroll(el, location.pathname, getTabScrollKey())} onScroll={scrollEnd}>
                    <For each={props.children}>{({ panel }, index) =>
                        <div class={getActives()[index()] ? styles.active! : ""}>{panel()}</div>
                    }</For>
                </main>
            </Match>
        </Switch>
    </div>
}
