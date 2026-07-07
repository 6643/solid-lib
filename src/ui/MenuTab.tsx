import styles from "./MenuTab.module.css";
import { createSignal, createTrackedEffect, For } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../utils/useKeepScroll";
import { IconButton } from "./Button";
import { icon_menu } from "./svgicons";

const useMenuTab = (key: string) => {
    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, key));
    const [getIndicator, setIndicator] = createSignal({ left: 0, width: 0 });
    const [getListEl, setListEl] = createSignal<HTMLElement>();

    const initIndicator = (index: number) => {
        const listEl = getListEl();
        if (!listEl) return;
        const child = listEl.children[index] as HTMLElement | undefined;
        if (child) setIndicator({ left: child.offsetLeft, width: child.offsetWidth });
    };

    const toIndex = (index: number) => {
        const listEl = getListEl();
        if (!listEl || index === getActiveIndex()) return;
        const child = listEl.children[index] as HTMLElement | undefined;
        if (!child) return;

        setPos(location.pathname, key, index);
        setIndicator({ left: child.offsetLeft, width: child.offsetWidth });
        setActiveIndex(index);
    };

    const mainRef = (index: number) => (el: HTMLElement) => useKeepScroll(el, location.pathname, `${key}.${index}`);
    const listRef = (el: HTMLElement) => {
        setListEl(el);
        setTimeout(() => initIndicator(getActiveIndex()));
    };

    return { getActiveIndex, getIndicator, toIndex, mainRef, listRef };
};

export const MenuTab = (props: { children: { name: string; panel: () => any }[] }) => {
    const { getActiveIndex, getIndicator, toIndex, mainRef, listRef } = useMenuTab("scroll.tab");

    createTrackedEffect(() => toIndex(getPos(location.pathname, "scroll.tab")));

    const active = () => props.children[getActiveIndex()];

    return (
        <div class={styles.menuTab} style={{ "--left": getIndicator().left, "--width": getIndicator().width }}>
            <nav>
                <div class={styles.navList} ref={listRef}>
                    <For each={props.children}>
                        {({ name }, index) => (
                            <div onClick={() => toIndex(index())} class={index() === getActiveIndex() ? styles.active : ""}>
                                {name}
                            </div>
                        )}
                    </For>
                </div>
                <IconButton icon={icon_menu} />
            </nav>

            <main ref={mainRef(getActiveIndex())}>{active()?.panel()}</main>
        </div>
    );
};
