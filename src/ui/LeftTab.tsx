import styles from "./LeftTab.module.css";
import type { Element } from "solid-js";
import { createSignal, For, getOwner, Show } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../utils/useKeepScroll";

const ITEM_HEIGHT = 68;

const useLeftTab = (key: string) => {
    const owner = getOwner();
    const initialIndex = getPos(location.pathname, key);
    const [getActiveIndex, setActiveIndex] = createSignal(initialIndex);
    const [isToUp, setToUp] = createSignal(false);
    const [getTop, setTop] = createSignal(ITEM_HEIGHT * initialIndex);
    const [getNavEl, setNavEl] = createSignal<HTMLElement>();

    const toIndex = (index: number) => {
        const navEl = getNavEl();
        if (!navEl || index === getActiveIndex()) return;
        navEl.children[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTop(ITEM_HEIGHT * index);
        setToUp(index > getActiveIndex());
        setActiveIndex(index);
        setPos(location.pathname, key, index);
    };

    const navRef = (el: HTMLElement) => setNavEl(el);
    const mainRef = (index: number) => (el: HTMLElement) => useKeepScroll(el, location.pathname, `${key}.${index}`, 32, owner);

    return { getActiveIndex, isToUp, getTop, toIndex, navRef, mainRef };
};

export const LeftTab = (props: { children: { name: string; panel: () => Element }[] }) => {
    const { getActiveIndex, isToUp, getTop, toIndex, navRef, mainRef } = useLeftTab("left.tab");

    return (
        <div class={styles.leftTab}>
            <nav ref={navRef} style={{ "--top": getTop() }}>
                <For each={props.children}>
                    {({ name }, index) => (
                        <div
                            onClick={() => toIndex(index())}
                            class={{ [styles.active!]: index() === getActiveIndex() }}
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
                            class={{
                                [styles.moveUp!]: isToUp(),
                                [styles.moveDown!]: !isToUp(),
                            }}
                        >
                            {panel()}
                        </main>
                    </Show>
                )}
            </For>
        </div>
    );
};
