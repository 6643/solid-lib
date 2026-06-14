import styles from "./TopTab.module.css";
import { createSignal, For, onSettled, Show } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll";
import { SvgIcon } from "./SvgIcon.tsx";

const useTopTab = (key: string) => {
    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, key));
    const [getIndicator, setIndicator] = createSignal({ left: 0, width: 0 });
    const [getNavEl, setNavEl] = createSignal<HTMLElement>();

    const toIndex = (index: number) => {
        const navEl = getNavEl();
        if (!navEl || index === getActiveIndex()) return;
        const child = navEl.children[index] as HTMLElement | undefined;
        if (!child) return;

        const rect = child.getBoundingClientRect();
        const navRect = navEl.getBoundingClientRect();
        if (rect.left < navRect.left || rect.right > navRect.right) {
            child.scrollIntoView({ behavior: "smooth", inline: "center" });
        }

        setPos(location.pathname, key, index);
        setIndicator({ left: child.offsetLeft, width: child.offsetWidth });
        setActiveIndex(index);
    };

    const navRef = (el: HTMLElement) => setNavEl(el);
    const mainRef = (index: number) => (el: HTMLElement) => useKeepScroll(el, location.pathname, `${key}.${index}`);

    return { getActiveIndex, getIndicator, toIndex, navRef, mainRef };
};

export const TopTab = (props: { children: { name?: string; icon?: string; panel: () => any }[] }) => {
    const { getActiveIndex, getIndicator, toIndex, navRef, mainRef } = useTopTab("top.tab");

    onSettled(() => toIndex(getPos(location.pathname, "top.tab")));

    return (
        <div class={styles.topTab}>
            <nav ref={navRef} style={{ "--left": getIndicator().left, "--width": getIndicator().width }}>
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
                        <main
                            ref={mainRef(index())}
                            class={index() < getActiveIndex() ? styles.moveRight : styles.moveLeft}
                        >
                            {panel()}
                        </main>
                    </Show>
                )}
            </For>
        </div>
    );
};
