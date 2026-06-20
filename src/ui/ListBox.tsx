import styles from "./ListBox.module.css"
import { createEffect, createMemo, createSignal, For, untrack, type Element } from "solid-js"

export const ListBox = <T,>(props: {
    items: T[]
    children: (item: T, index: number) => Element
    filter?: (item: T, index?: number) => boolean
    overscan?: number
    index?: number
    itemHeight?: number
}) => {
    const overscan = props.overscan ?? 16
    const fallbackHeight = props.itemHeight ?? 48

    const [getEl, setEl] = createSignal<HTMLElement>()
    const [start, setStart] = createSignal(0)
    const [getSlice, setSlice] = createSignal<T[]>([])
    const [getHeights, setHeights] = createSignal<Map<number, number>>(new Map())
    const getItems = createMemo(() => props.filter ? props.items.filter(props.filter) : props.items)

    const cumulativeHeight = (heights: Map<number, number>, to: number) => {
        let total = 0
        for (let i = 0; i < to; i++) total += heights.get(i) ?? fallbackHeight
        return total
    }

    const getTotalHeight = createMemo(() => {
        const items = getItems()
        const heights = getHeights()
        return cumulativeHeight(heights, items.length)
    })

    const getOffset = createMemo(() => {
        const heights = getHeights()
        const s = start()
        return s > 0 ? cumulativeHeight(heights, s) : 0
    })

    const findIndexAt = (scrollTop: number): number => {
        const { items, heights } = untrack(() => ({ items: getItems(), heights: getHeights() }))
        let acc = 0
        for (let i = 0; i < items.length; i++) {
            const h = heights.get(i) ?? fallbackHeight
            if (acc + h > scrollTop) return i
            acc += h
        }
        return items.length - 1
    }

    let lastStrat = -1
    let lastEnd = -1

    const updateSlice = (index: number, shouldScroll = false) => {
        const items = untrack(getItems)
        const _index = Math.max(0, Math.min(index, items.length - 1))
        const strat = Math.max(0, _index - overscan)
        const end = Math.min(items.length, _index + 2 * overscan + 1)

        if (strat !== lastStrat || end !== lastEnd) {
            lastStrat = strat
            lastEnd = end
            setStart(strat)
            setSlice(items.slice(strat, end))
        }

        if (!shouldScroll) return
        queueMicrotask(() => {
            const el = untrack(getEl)
            if (!el) return
            const current = getFirstVerticalUnobscuredChildIndex(el)
            if (index !== -1 && current !== index) {
                const target = el.querySelector(`[data-index="${index}"]`)
                if (target) target.scrollIntoView()
            }
        })
    }

    let rafId = 0
    const handleScroll = () => {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
            rafId = 0
            const el = untrack(getEl)
            if (!el) return
            const index = findIndexAt(el.scrollTop)
            updateSlice(index, false)
        })
    }

    createEffect(
        () => props.index ?? 0,
        (index) => updateSlice(index, true),
    )

    createEffect(
        () => getItems(),
        () => {
            lastStrat = -1
            lastEnd = -1
            setHeights(new Map())
            updateSlice(0, true)
        },
    )

    createEffect(
        () => {
            const el = getEl()
            getSlice()
            const viewport = el?.children[0]?.children[0] as HTMLElement | undefined
            const heights = getHeights()
            return { viewport, heights }
        },
        ({ viewport, heights }) => {
            if (!viewport || viewport.children.length === 0) return
            queueMicrotask(() => {
                const next = new Map(heights)
                let changed = false
                for (let i = 0; i < viewport.children.length; i++) {
                    const child = viewport.children[i] as HTMLElement
                    const idx = child.dataset.index
                    if (idx !== undefined) {
                        const h = child.getBoundingClientRect().height
                        const numIdx = Number(idx)
                        if (next.get(numIdx) !== h) {
                            next.set(numIdx, h)
                            changed = true
                        }
                    }
                }
                if (changed) setHeights(() => next)
            })
        },
    )

    return <div class={styles.listBox} ref={setEl} onScroll={handleScroll}>
        <div class={styles.inner} style={{ height: getTotalHeight() + "px" }}>
            <div class={styles.viewport} style={{ transform: "translateY(" + getOffset() + "px)" }}>
                <For each={getSlice()}>
                    {(item, i) => {
                        const index = untrack(() => start() + i())
                        return <div data-index={index}>{props.children(item, index)}</div>
                    }}
                </For>
            </div>
        </div>
    </div>
}


const getFirstVerticalUnobscuredChildIndex = (el: HTMLElement): number => {
    if (!el) return -1

    const elRect = el.getBoundingClientRect()
    const viewport = el.children[0]?.children[0]
    if (!viewport) return -1

    const list = Array.from(viewport.children) as HTMLElement[]
    const child = list.find((child) => {
        if (child.dataset.index === undefined) return false
        const childRect = child.getBoundingClientRect()
        return childRect.bottom > elRect.top && childRect.top < elRect.bottom
    })

    if (child) return Number(child.dataset.index)

    return -1
}
