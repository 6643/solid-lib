import styles from "./FlexBox.module.css"
import { createEffect, type Element, children, createMemo } from "solid-js"

export const FlexBox = (props: {
    children: Element
    dir?: "row" | "row-reverse" | "column" | "column-reverse"
    wrap?: "nowrap" | "wrap" | "wrap-reverse"
    ai?: "flex-start" | "flex-end" | "center" | "baseline" | "stretch"
    jc?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly"
    ac?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "stretch"
    gap?: number

    as?: ("auto" | "flex-start" | "flex-end" | "center" | "baseline" | "stretch")[]
    fg?: number[]
    fs?: number[]
    order?: number[]

    class?: string
    style?: Record<string, string | number>
}) => {

    const get_class = createMemo(() => [styles.FlexBox, props.class].filter(Boolean).join(" "))
    const get_style = createMemo(() => {
        return {
            "--dir": props.dir,
            "--wrap": props.wrap,
            "--align": props.ai,
            "--justify": props.jc,
            "--ac": props.ac,
            "--gap": props.gap,
            ...props.style
        }
    })

    const resolved = children(() => props.children)
    createEffect(
        () => resolved.toArray(),
        (childNodes) => {
            childNodes.forEach((child: any, i: number) => {
                if (!(child instanceof HTMLElement)) return
                if (props.as) child.style.alignSelf = props.as[i]!
                if (props.fg) child.style.flexGrow = String(props.fg[i])
                if (props.fs) child.style.flexShrink = String(props.fs[i])
                if (props.order) child.style.order = String(props.order[i])
            })
        }
    )

    return <div class={get_class()} style={get_style()}>
        {resolved()}
    </div>

}
