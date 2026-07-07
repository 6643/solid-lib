import styles from "./TopTab.module.css";
import { createSignal, createTrackedEffect, For, Show } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../utils/useKeepScroll";
import { SvgIcon } from "./SvgIcon.tsx";

const useTopTab = (key: string) => {
    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, key));

    const toIndex = (index: number) => {
        if (index === getActiveIndex()) return;
        setPos(location.pathname, key, index);
        setActiveIndex(index);
    };

    const mainRef = (index: number) => (el: HTMLElement) => useKeepScroll(el, location.pathname, `${key}.${index}`);

    return { getActiveIndex, toIndex, mainRef };
};

export const TopTab = (props: { children: { name?: string; icon?: string; panel: () => any }[] }) => {
    const { getActiveIndex, toIndex, mainRef } = useTopTab("top.tab");

    createTrackedEffect(() => toIndex(getPos(location.pathname, "top.tab")));

    return (
        <div class={styles.topTab}>
            <nav style={{ "--count": props.children.length, "--index": getActiveIndex() }}>
                <For each={props.children}>
                    {({ name, icon }, index) => (
                        <div class={index() === getActiveIndex() ? styles.active : ""} onClick={() => toIndex(index())}>
                            {icon && <SvgIcon size={24} name={icon} />}
                            {name && <span>{name}</span>}
                        </div>
                    )}
                </For>
            </nav>

            <For each={props.children}>
                {({ panel }, index) => (
                    <Show when={index() === getActiveIndex()}>
                        <main ref={mainRef(index())} class={index() < getActiveIndex() ? styles.moveRight : styles.moveLeft}>
                            {panel()}
                        </main>
                    </Show>
                )}
            </For>
        </div>
    );
};
