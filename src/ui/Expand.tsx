import styles from "./Expand.module.css";
import { createSignal, Show, createTrackedEffect } from "solid-js";
import { SvgIcon } from "./SvgIcon";
import { icon_chevron_right } from "./svgicons";

export const Expand = (props: { title: string; children: any }) => {
    const [getVis, setVis] = createSignal(false);
    const [isActive, setActive] = createSignal(false);

    createTrackedEffect(() => {
        if (getVis()) {
            setActive(true);
            return;
        }
        const timer = setTimeout(() => setActive(false), 400);
        return () => clearTimeout(timer);
    });

    const toggle = () => setVis(!getVis());

    return (
        <div class={[styles.expand, getVis() && styles.active]}>
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
