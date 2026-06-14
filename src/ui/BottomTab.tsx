import styles from "./BottomTab.module.css";
import { createSignal, For, onSettled, Show } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll";
import { SvgIcon } from "./SvgIcon.tsx";

const useBottomTab = (key: string) => {
    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, key));
    const [spinDeg, setSpinDeg] = createSignal(0);

    const toIndex = (index: number) => {
        if (index === getActiveIndex()) return;
        setPos(location.pathname, key, index);
        const goingLeft = index < getActiveIndex();
        setActiveIndex(index);
        setSpinDeg(d => d + (goingLeft ? -360 : 360));
    };

    const mainRef = (index: number) => (el: HTMLElement) => useKeepScroll(el, location.pathname, `${key}.${index}`);

    return { getActiveIndex, spinDeg, toIndex, mainRef };
};

export const BottomTab = (props: { children: { icon: string; panel: () => any }[] }) => {
    const { getActiveIndex, spinDeg, toIndex, mainRef } = useBottomTab("app.tab");

    onSettled(() => toIndex(getPos(location.pathname, "app.tab")));

    return (
        <div class={styles.bottomTab}>
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

            <nav style={{ "--len": props.children.length, "--index": getActiveIndex(), "--spin": spinDeg() }}>
                <For each={props.children}>
                    {({ icon }, index) => (
                        <div class={index() === getActiveIndex() ? styles.active : ""} onClick={() => toIndex(index())}>
                            <SvgIcon size={24} name={icon} />
                        </div>
                    )}
                </For>
            </nav>
        </div>
    );
};
