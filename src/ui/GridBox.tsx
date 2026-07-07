import styles from "./GridBox.module.css"
import { children, createMemo, createTrackedEffect } from "solid-js"
import type * as CSS from "csstype"

export const GridBox = (props: {
    children: any
    columns?: string
    rows?: string
    areas?: string
    gap?: number

    class?: string
    style?: CSS.Properties
}) => {

    const getClass = createMemo(() => [styles.grid_box, props.class].filter(Boolean).join(" "))
    const getStyle = createMemo(() => {
        const areas = props.areas ? toArgs(props.areas) : undefined
        return {
            "--columns": props.columns,
            "--rows": props.rows,
            "--gap": props.gap,
            "--areas": areas,
            ...props.style,
        }
    })

    const resolved = children(() => props.children)
    createTrackedEffect(() => {
        const nodes = resolved.toArray();
        nodes.forEach((child: any, i: number) => {
            if (child instanceof HTMLElement) child.style.gridArea = toIndex((i + 1).toString())
        })
    })

    return <div class={getClass()} style={getStyle()}>
        {resolved() as any}
    </div>

}

const toIndex = (index: string) => /^\d+$/.test(index) ? `_${index}` : index

const toArgs = (str: string): string => {
    const parts = str.replace(/ /g, "").split(";").map(part => {
        const [first, second] = part.split(",");

        if (first === undefined || second === undefined) return ""
        return `"_${first} _${second}"`
    })

    const result = parts.filter(p => p !== "").join(" ")
    return result;
}
