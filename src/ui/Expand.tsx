import styles from "./Expand.module.css";
import { createSignal, Show, createEffect, type Element } from "solid-js";
import { SvgIcon } from "./SvgIcon";
import { icon_chevron_right } from "./svgicons";

export const Expand = (props: { title: string; children: Element }) => {
    const [getVis, setVis] = createSignal(false);
    const [isActive, setActive] = createSignal(false);

    createEffect(
        () => getVis(),
        (visible) => {
            if (visible) {
                setActive(true);
                return;
            }
            const timer = setTimeout(() => setActive(false), 400);
            return () => clearTimeout(timer);
        },
    );

    const toggle = () => setVis(!getVis());

    return (
        <div class={[styles.expand, { [styles.active!]: getVis() }]}>
            <nav onClick={toggle}>
                <span>{props.title}</span>
                <SvgIcon name={icon_chevron_right} />
            </nav>
            <Show when={isActive()}>
                <div>{props.children}</div>
            </Show>
        </div>
    );
};
