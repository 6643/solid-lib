import styles from "./NavTab.module.css";
import { createSignal, For, onSettled } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll";
import { createDebounce } from "../use/createDebounce";

const getChildsVis = (boxEl: HTMLElement): { ratio: number; offset: number }[] => {
    const containerRect = boxEl.getBoundingClientRect();
    const containerY = containerRect.y;
    const containerHeight = containerRect.height;
    const children = Array.from(boxEl.children);

    return children.map((child) => {
        const childRect = child.getBoundingClientRect();
        const childHeight = childRect.height;
        if (childHeight === 0) return { ratio: 0, offset: 0 };

        const visibleTop = Math.max(childRect.y - containerY, 0);
        const visibleBottom = Math.min(childRect.bottom - containerY, containerHeight);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        const offset = Math.max(0, containerY - childRect.y) / childHeight;
        return { ratio: visibleHeight / childHeight, offset };
    });
};

const ITEM_H = 48;
const GAP = 4;
const STEP = ITEM_H + GAP;

const useNavTab = (key: string) => {
    const [getActives, setActives] = createSignal<boolean[]>([]);
    const [getTop, setTop] = createSignal(0);
    const [getHeight, setHeight] = createSignal(0);
    const [getNavEl, setNavEl] = createSignal<HTMLElement>();
    const [getMainEl, setMainEl] = createSignal<HTMLElement>();
    let clickIndex = -1;

    const computed = (content: HTMLElement, navCount?: number) => {
        const childsVis = getChildsVis(content);
        const ratios = childsVis.reduce((sum, c) => sum + c.ratio, 0);
        if (ratios === 0) return;

        const firstIndex = childsVis.findIndex((c) => c.ratio > 0);
        const first = childsVis[firstIndex] ?? { ratio: 0, offset: 0 };
        const height = ratios * ITEM_H + (Math.ceil(ratios) - 1) * GAP;
        const lastBottom = navCount ? (navCount - 1) * STEP + ITEM_H : 0;

        setHeight(height);

        if (clickIndex >= 0) {
            setActives(Array.from(content.children).map((_, i) => i === clickIndex));
            let top = STEP * clickIndex;
            if (top + height > lastBottom) top = lastBottom - height;
            setTop(Math.max(0, top));
        } else {
            setActives(childsVis.map((c) => c.ratio > 0));
            let top = STEP * firstIndex + first.offset * STEP;
            if (top + height > lastBottom) top = lastBottom - height;
            setTop(Math.max(0, top));
        }
    };

    const toIndex = (index: number) => {
        const navEl = getNavEl();
        const mainEl = getMainEl();
        if (!navEl || !mainEl) return;
        clickIndex = index;
        navEl.children[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
        mainEl.children[index]?.scrollIntoView();
        computed(mainEl, navEl.children.length);
        setPos(location.pathname, key, index);
        setTimeout(() => { clickIndex = -1; }, 500);
    };

    const onScroll = createDebounce((e: Event) => {
        if (clickIndex >= 0) return;
        computed(e.target as HTMLElement, getNavEl()?.children.length);
    }, 32);

    const navRef = (el: HTMLElement) => setNavEl(el);
    const mainRef = (el: HTMLElement) => {
        setMainEl(el);
        useKeepScroll(el, location.pathname, key);
    };

    return { getActives, getTop, getHeight, toIndex, onScroll, navRef, mainRef };
};

export const NavTab = (props: { children: { name: string; panel: () => any }[] }) => {
    const { getActives, getTop, getHeight, toIndex, onScroll, navRef, mainRef } = useNavTab("nav.tab");

    onSettled(() => {
        queueMicrotask(() => toIndex(getPos(location.pathname, "nav.tab")));
    });

    return (
        <div class={styles.navTab}>
            <nav ref={navRef} style={{ "--top": getTop(), "--height": getHeight() }}>
                <For each={props.children}>
                    {({ name }, index) => (
                        <div onClick={() => toIndex(index())} class={getActives()[index()] ? styles.active : ""}>
                            {name}
                        </div>
                    )}
                </For>
            </nav>

            <main ref={mainRef} onScroll={onScroll}>
                <For each={props.children}>{({ panel }) => <div>{panel()}</div>}</For>
            </main>
        </div>
    );
};
