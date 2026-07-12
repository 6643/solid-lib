import styles from "./FlexBox.module.css"
import { children, createMemo, createEffect, type Element } from "solid-js"
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

    const get_class = createMemo(() => [styles.flex_box, props.class])
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
        () => ({
            nodes: resolved.toArray(),
            as: props.as,
            fg: props.fg,
            fs: props.fs,
            order: props.order,
        }),
        ({ nodes, as, fg, fs, order }) => {
            nodes.forEach((child, i) => {
                if (!(child instanceof HTMLElement)) return;
                if (as) child.style.alignSelf = as[i]!;
                if (fg) child.style.flexGrow = String(fg[i]);
                if (fs) child.style.flexShrink = String(fs[i]);
                if (order) child.style.order = String(order[i]);
            });
        },
    );

    return <div class={get_class()} style={get_style()}>
        {resolved()}
    </div>

}
