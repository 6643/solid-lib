import styles from "./StackBox.module.css"
import { children, createEffect } from "solid-js"
export const StackBox = (props: {
    children: any
    pos?: { x?: number, y?: number }[]
}) => {

    const getStyle = (x?: number, y?: number): string[] => {
        if (!x && !y) return [];
        const result = []
        if (x) result.push(x < 0 ? `--right:${-x}` : `--left:${x}`)
        if (y) result.push(y < 0 ? `--bottom:${-y}` : `--top:${y}`)
        return result
    }
    const resolved = children(() => props.children)

    createEffect(
        () => ({ nodes: resolved.toArray(), pos: props.pos }),
        ({ nodes, pos }) => nodes.forEach((child: any, i: number) => {
            if (!(child instanceof HTMLElement)) return
            const p = pos?.[i]
            if (!p) return
            const style = getStyle(p.x, p.y)
            style.forEach(s => {
                const parts = s.split(":") as [string, string]
                child.style.setProperty(parts[0], parts[1])
            })
        })
    )


    return <div class={styles.stack_box}>
        {resolved() as any}
    </div>
}

