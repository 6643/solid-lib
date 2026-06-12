import styles from "./apptap.module.css";
import { createSignal, For, onSettled, Show } from "solid-js";
import { getPos, setPos, useKeepScroll } from "../use/useKeepScroll";
import { SvgIcon } from "./svgicon.tsx";

export const AppTap = (props: { children: { icon: string; panel: () => any }[] }) => {
    const key = "app.tab";
    const getTabIndexKey = () => key;
    const getTabScrollKey = (index: number = -1) => (index === -1 ? key : `${key}.${index}`);

    const [getActiveIndex, setActiveIndex] = createSignal(getPos(location.pathname, getTabIndexKey()));
    const [isToLeft, setToLeft] = createSignal(false);

    const toIndex = (index: number) => {
        if (index == getActiveIndex()) return;
        setPos(location.pathname, getTabIndexKey(), index);
        setToLeft(index > getActiveIndex());
        setActiveIndex(index);
        resetDeg();
    };

    const [getDeg, setDeg] = createSignal(0);
    const resetDeg = () => {
        setDeg(isToLeft() ? 0 : 360);
        setTimeout(() => setDeg(isToLeft() ? 360 : 0), 256);
    };

    onSettled(() => toIndex(getActiveIndex()));

    return (
        <div class={styles.appTap}>
            <For each={props.children}>
                {({ panel }, index) => (
                    <Show when={index() == getActiveIndex()}>
                        <main
                            ref={(el: HTMLElement) => useKeepScroll(el, location.pathname, getTabScrollKey(index()))}
                            class={isToLeft() ? styles.moveRight : styles.moveLeft}
                        >
                            {panel()}
                        </main>
                    </Show>
                )}
            </For>

            <nav style={{ "--len": props.children.length, "--index": getActiveIndex(), "--deg": getDeg() }}>
                <For each={props.children}>
                    {({ icon }, index) => (
                        <div onClick={() => toIndex(index())}>
                            <SvgIcon size={48} color={index() == getActiveIndex() ? "white" : undefined} name={icon} />
                        </div>
                    )}
                </For>
            </nav>
        </div>
    );
};
