import styles from "./LeftTab.module.css";
import { createSignal, For, onSettled, Show } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll";

const useLeftTab = (key: string) => {
    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, key));
    const [isToUp, setToUp] = createSignal(false);
    const [getTop, setTop] = createSignal(0);
    const [getNavEl, setNavEl] = createSignal<HTMLElement>();

    const toIndex = (index: number) => {
        const navEl = getNavEl();
        if (!navEl || index === getActiveIndex()) return;
        navEl.children[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTop(68 * index);
        setToUp(index > getActiveIndex());
        setActiveIndex(index);
        setPos(location.pathname, key, index);
    };

    const navRef = (el: HTMLElement) => setNavEl(el);
    const mainRef = (index: number) => (el: HTMLElement) => useKeepScroll(el, location.pathname, `${key}.${index}`);

    return { getActiveIndex, isToUp, getTop, toIndex, navRef, mainRef };
};

export const LeftTab = (props: { children: { name: string; panel: () => any }[] }) => {
    const { getActiveIndex, isToUp, getTop, toIndex, navRef, mainRef } = useLeftTab("left.tab");

    onSettled(() => toIndex(getPos(location.pathname, "left.tab")));

    return (
        <div class={styles.leftTab}>
            <nav ref={navRef} style={{ "--top": getTop() }}>
                <For each={props.children}>
                    {({ name }, index) => (
                        <div
                            onClick={() => toIndex(index())}
                            class={index() === getActiveIndex() ? styles.active : ""}
                        >
                            {name}
                        </div>
                    )}
                </For>
            </nav>

            <For each={props.children}>
                {({ panel }, index) => (
                    <Show when={index() === getActiveIndex()}>
                        <main
                            ref={mainRef(index())}
                            class={isToUp() ? styles.moveUp : styles.moveDown}
                        >
                            {panel()}
                        </main>
                    </Show>
                )}
            </For>
        </div>
    );
};
