import styles from "./MenuTab.module.css";
import { createSignal, For, onSettled } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll";
import { createDebounce } from "../use/createDebounce";

const getChildsVis = (boxEl: HTMLElement): number[] => {
    const containerRect = boxEl.getBoundingClientRect();
    const containerY = containerRect.y;
    const containerHeight = containerRect.height;
    const children = Array.from(boxEl.children);

    return children.map((child) => {
        const childRect = child.getBoundingClientRect();
        const childHeight = childRect.height;
        if (childHeight === 0) return 0;

        const visibleTop = Math.max(childRect.y - containerY, 0);
        const visibleBottom = Math.min(childRect.bottom - containerY, containerHeight);
        return Math.max(0, visibleBottom - visibleTop) / childHeight;
    });
};

const useMenuTab = (key: string) => {
    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, key));
    const [getActives, setActives] = createSignal<boolean[]>([]);
    const [getNavEl, setNavEl] = createSignal<HTMLElement>();
    const [getMainEl, setMainEl] = createSignal<HTMLElement>();

    const computed = (content: HTMLElement) => {
        const ratios = getChildsVis(content);
        const visibleCount = ratios.filter(r => r > 0).length;
        if (visibleCount === 0) return;
        setActives(ratios.map(r => r > 0));
    };

    const toIndex = (index: number) => {
        const navEl = getNavEl();
        const mainEl = getMainEl();
        if (!navEl || !mainEl || index === getActiveIndex()) return;
        navEl.children[index]?.scrollIntoView({ behavior: "smooth", inline: "center" });
        mainEl.children[index]?.scrollIntoView();
        computed(mainEl);
        setActiveIndex(index);
        setPos(location.pathname, key, index);
    };

    const onScroll = createDebounce((e: Event) => {
        computed(e.target as HTMLElement);
    }, 32);

    const navRef = (el: HTMLElement) => setNavEl(el);
    const mainRef = (el: HTMLElement) => {
        setMainEl(el);
        useKeepScroll(el, location.pathname, key);
    };

    return { getActiveIndex, getActives, toIndex, onScroll, navRef, mainRef };
};

export const MenuTab = (props: { children: { name: string; panel: () => any }[] }) => {
    const { getActiveIndex, getActives, toIndex, onScroll, navRef, mainRef } = useMenuTab("scroll.tab");

    onSettled(() => toIndex(getPos(location.pathname, "scroll.tab")));

    return (
        <div class={styles.menuTab}>
            <nav ref={navRef}>
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

            <main ref={mainRef} onScroll={onScroll}>
                <For each={props.children}>
                    {({ panel }, index) => (
                        <div class={getActives()[index()] ? styles.active : ""}>
                            {panel()}
                        </div>
                    )}
                </For>
            </main>
        </div>
    );
};
