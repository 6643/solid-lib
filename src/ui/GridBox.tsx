import styles from "./GridBox.module.css"
import { children, createMemo, createEffect, type Element } from "solid-js"
import type * as CSS from "csstype"

export const GridBox = (props: {
    children: Element
    columns?: string
    rows?: string
    areas?: string
    gap?: number

    class?: string
    style?: CSS.Properties
}) => {

    const getClass = createMemo(() => [styles.grid_box, props.class])
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
    createEffect(
        () => resolved.toArray(),
        (nodes) => {
            nodes.forEach((child, i) => {
                if (child instanceof HTMLElement) child.style.gridArea = toIndex((i + 1).toString());
            });
        },
    );

    return <div class={getClass()} style={getStyle()}>
        {resolved()}
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
