import styles from "./StackBox.module.css"
import { children, createEffect } from "solid-js"
export const StackBox = (props: {
    children: any
    pos?: { x?: number, y?: number }[]
}) => {

    const getStyle = (x?: number, y?: number): string[] => {
        if (!x || !y || x == 0 || y == 0) return [];
        const result = []
        x < 0 ? result.push(`--right:${-x}`) : result.push(`--left:${x}`)
        y < 0 ? result.push(`--bottom:${-y}`) : result.push(`--top:${y}`)
        return result
    }
    const resolved = children(() => props.children)

    createEffect(
        () => resolved.toArray(),
        (childNodes) => childNodes.forEach((child: any, i: number) => {
            if (!(child instanceof HTMLElement)) return
            const pos = props.pos?.[i]
            if (!pos) return
            const style = getStyle(pos.x, pos.y)
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

