import styles from "./listbox.module.css";
import { children, createEffect, createMemo, createSignal, For, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { useScrollEnd } from "../use/useScrollEnd";

export const ListBox = <T,>(props: {
    items: T[];
    children: (item: T, index: number) => JSX.Element;
    filter?: (item: T, index?: number) => boolean;
    overscan?: number;
    index?: number;
}) => {
    const overscan = untrack(() => props.overscan) ?? 16;

    const [getEl, setEl] = createSignal<HTMLElement>();
    const [getSlice, setSlice] = createSignal<{ item: T; absIndex: number }[]>([]);
    const getItems = createMemo(() => (props.filter ? props.items.filter(props.filter) : props.items));

    const updateSlice = (index: number) => {
        const items = getItems();

        const _index = Math.max(0, Math.min(index, items.length - 1));
        const strat = Math.max(0, _index - overscan);
        const end = Math.min(items.length, _index + 2 * overscan);

        setSlice(items.slice(strat, end).map((item, i) => ({ item, absIndex: strat + i })));

        queueMicrotask(() => {
            const el = getEl();
            if (!el) return;
            const _index = getFirstVerticalUnobscuredChildIndex(el);
            if (index !== -1 && _index !== index) el.querySelector(`[data-index="${index}"]`)?.scrollIntoView();
        });
    };

    // Initial render
    createEffect(
        () => props.index ?? 0,
        (index) => updateSlice(index),
    );

    // Re-slice when items change
    createEffect(
        () => getItems(),
        () => updateSlice(0),
    );

    // Re-slice when element becomes available
    createEffect(
        () => getEl(),
        (el) => { if (el) updateSlice(0); },
    );

    useScrollEnd(getEl, () => {
        const el = getEl();
        if (!el) return;

        const index = getFirstVerticalUnobscuredChildIndex(el);
        if (index !== -1) updateSlice(index);
    });

    const renderChildren = (item: T, index: number) => {
        const resolved = children(() => props.children(item, index));
        const list = resolved.toArray().filter((child) => child instanceof HTMLElement);
        if (list.length === 0) return null;
        list[0]!.dataset.index = index.toString();
        return resolved();
    };

    return (
        <div class={styles.listBox} ref={setEl}>
            <For each={getSlice()}>
                {({ item, absIndex }) => renderChildren(item, absIndex)}
            </For>
        </div>
    );
};

const getFirstVerticalUnobscuredChildIndex = (el: HTMLElement): number => {
    if (!el) return -1;

    const elRect = el.getBoundingClientRect();
    const list = Array.from(el.children) as HTMLElement[];
    const child = list.find((child) => {
        if (child.dataset.index === undefined) return false;
        const childRect = child.getBoundingClientRect();
        return childRect.bottom > elRect.top && childRect.top < elRect.bottom;
    });

    if (child) return Number(child.dataset.index);

    return -1;
};
