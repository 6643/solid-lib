import styles from "./ListBox.module.css";
import { createMemo, createSignal, createTrackedEffect, For, untrack, type Element } from "solid-js";
import { useScrollEnd } from "../utils/useScrollEnd";

type ListBoxRow<T> = {
    item: T;
    index: number;
};

type VisibleBounds = {
    firstVisibleRow: HTMLElement;
    lastVisibleRow: HTMLElement;
    visibleCount: number;
};

export const ListBox = <T,>(props: {
    items: T[];
    children: (item: T, index: number) => Element;
    filter?: (item: T, index?: number) => boolean;
    index?: number;
    changed?: (index: number) => void;
}) => {
    const [getEl, setEl] = createSignal<HTMLElement>();
    const [getStart, setStart] = createSignal(0);
    const [getRows, setRows] = createSignal<ListBoxRow<T>[]>([]);
    const [getVisibleCount, setVisibleCount] = createSignal(8);
    const getItems = createMemo(() => (props.filter ? props.items.filter(props.filter) : props.items));
    let ignoredScrollTop: number | undefined;
    let ignoredIndex: number | undefined;

    const getHideItems = () => Math.max(0, Math.floor(getVisibleCount() / 3));
    const getRenderCount = () => Math.max(1, getVisibleCount() + getHideItems() * 3);

    const clampStart = (start: number, itemCount: number, renderCount = getRenderCount()) => {
        const maxStart = Math.max(0, itemCount - renderCount);
        return Math.max(0, Math.min(start, maxStart));
    };

    const createRows = (items: T[], start: number, count = getRenderCount()): ListBoxRow<T>[] =>
        items.slice(start, start + count).map((item, offset) => ({
            item,
            index: start + offset,
        }));

    const appendRows = (rows: ListBoxRow<T>[], items: T[], start: number, delta: number, renderCount: number) => {
        const keepCount = Math.max(0, rows.length - delta);
        const appendCount = Math.max(0, renderCount - keepCount);
        return [...rows.slice(delta), ...createRows(items, start + rows.length, appendCount)];
    };

    const prependRows = (rows: ListBoxRow<T>[], items: T[], start: number, delta: number, renderCount: number) => {
        const keepCount = Math.max(0, rows.length - delta);
        const prependCount = Math.max(0, renderCount - keepCount);
        return [...createRows(items, start, prependCount), ...rows.slice(0, keepCount)];
    };

    const getRowEdgeOffset = (el: HTMLElement, index: number, edge: "top" | "bottom") => {
        const row = el.querySelector<HTMLElement>(`[data-index="${index}"]`);
        if (!row) return undefined;
        const rowRect = row.getBoundingClientRect();
        const containerRect = el.getBoundingClientRect();
        return edge === "top" ? rowRect.top - containerRect.top : rowRect.bottom - containerRect.bottom;
    };

    const snapRowToEdge = (
        el: HTMLElement,
        index: number,
        edge: "top" | "bottom",
    ) => {
        applyScrollTopOffset(el, getRowEdgeOffset(el, index, edge));
    };

    const applyScrollTopOffset = (el: HTMLElement, nextOffset: number | undefined) => {
        if (nextOffset === undefined || nextOffset === 0) return;
        setScrollTopWithoutSettling(el, Math.max(0, el.scrollTop + nextOffset));
    };

    const getSnapTarget = (
        currentStart: number,
        renderCount: number,
        itemCount: number,
        firstVisibleIndex: number,
        lastVisibleIndex: number,
    ): { index: number; edge: "top" | "bottom" } | undefined => {
        if (currentStart === 0) {
            return { index: firstVisibleIndex, edge: "top" };
        }

        if (currentStart + renderCount >= itemCount) {
            return { index: lastVisibleIndex, edge: "bottom" };
        }

        return undefined;
    };

    const settleWindow = (
        el: HTMLElement,
        currentStart: number,
        renderCount: number,
        hideItems: number,
        firstVisibleIndex: number,
        firstVisibleRow: HTMLElement,
    ) => {
        const topHiddenCount = firstVisibleIndex - currentStart;
        const targetTopHidden = currentStart === 0 ? 0 : hideItems;
        const delta = topHiddenCount - targetTopHidden;

        if (delta !== 0) {
            shiftWindow(delta, el, firstVisibleRow, renderCount);
            return false;
        }

        return true;
    };

    const settleEdge = (
        el: HTMLElement,
        currentStart: number,
        renderCount: number,
        items: T[],
        visibleBounds?: VisibleBounds,
    ) => {
        if (!visibleBounds) return;

        const firstVisibleIndex = Number(visibleBounds.firstVisibleRow.dataset.index);
        const lastVisibleIndex = Number(visibleBounds.lastVisibleRow.dataset.index);
        if (!Number.isFinite(firstVisibleIndex) || !Number.isFinite(lastVisibleIndex)) return;

        const snapTarget = getSnapTarget(currentStart, renderCount, items.length, firstVisibleIndex, lastVisibleIndex);
        if (!snapTarget) return;
        snapRowToEdge(el, snapTarget.index, snapTarget.edge);
    };

    const getVisibleBounds = (el: HTMLElement): VisibleBounds | undefined => {
        const containerRect = el.getBoundingClientRect();
        const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-index]"));
        const visibleRows = rows.filter((row) => {
            const rect = row.getBoundingClientRect();
            return rect.bottom > containerRect.top && rect.top < containerRect.bottom;
        });

        if (visibleRows.length === 0) return undefined;

        const firstVisibleRow = visibleRows[0];
        const lastVisibleRow = visibleRows[visibleRows.length - 1];
        if (!firstVisibleRow || !lastVisibleRow) return undefined;

        return {
            firstVisibleRow,
            lastVisibleRow,
            visibleCount: visibleRows.length,
        };
    };

    const setWindow = (start: number, items = untrack(getItems), renderCount = getRenderCount()) => {
        const nextStart = clampStart(start, items.length, renderCount);
        setStart(nextStart);
        setRows(createRows(items, nextStart, renderCount));
        return nextStart;
    };

    const setShiftedRows = (
        currentStart: number,
        nextStart: number,
        rows: ListBoxRow<T>[],
        items: T[],
        renderCount: number,
    ) => {
        const amount = Math.abs(nextStart - currentStart);
        setStart(nextStart);
        setRows(
            nextStart > currentStart
                ? appendRows(rows, items, currentStart, amount, renderCount)
                : prependRows(rows, items, nextStart, amount, renderCount),
        );
    };

    const shiftWindowToStart = (nextStart: number, items: T[], renderCount: number) => {
        const currentStart = untrack(getStart);
        const rows = untrack(getRows);
        if (nextStart === currentStart && rows.length === renderCount) return;

        const amount = Math.abs(nextStart - currentStart);
        if (rows.length !== renderCount || amount >= renderCount) {
            setWindow(nextStart, items, renderCount);
            return;
        }

        setShiftedRows(currentStart, nextStart, rows, items, renderCount);
    };

    const scrollIndexIntoView = (index: number) => {
        queueMicrotask(() => {
            const el = untrack(getEl);
            if (!el) return;
            const target = el.querySelector<HTMLElement>(`[data-index="${index}"]`);
            const previousScrollTop = el.scrollTop;
            target?.scrollIntoView({ block: "start" });
            if (el.scrollTop !== previousScrollTop) ignoredScrollTop = el.scrollTop;
        });
    };

    const setWindowForIndex = (index: number, items: T[]) => {
        const renderCount = untrack(getRenderCount);
        if (items.length === 0) {
            setWindow(0, items, renderCount);
            return;
        }

        const targetIndex = Math.max(0, Math.min(index, items.length - 1));
        const start = clampStart(targetIndex, items.length, renderCount);
        shiftWindowToStart(start, items, renderCount);
        scrollIndexIntoView(targetIndex);
    };

    const setScrollTopWithoutSettling = (el: HTMLElement, nextScrollTop: number) => {
        ignoredScrollTop = nextScrollTop;
        el.scrollTop = nextScrollTop;
    };

    const shiftWindow = (delta: number, el: HTMLElement, anchorRow: HTMLElement, renderCount: number) => {
        const items = untrack(getItems);
        const currentStart = untrack(getStart);
        const nextStart = clampStart(currentStart + delta, items.length, renderCount);
        if (nextStart === currentStart) return;

        const rows = untrack(getRows);
        setShiftedRows(currentStart, nextStart, rows, items, renderCount);

        queueMicrotask(() => {
            const index = Number(anchorRow.dataset.index);
            if (!Number.isFinite(index)) return;

            applyScrollTopOffset(el, getRowEdgeOffset(el, index, "top"));

            if (nextStart === 0 || nextStart + renderCount >= items.length) {
                settleEdge(el, nextStart, renderCount, items, getVisibleBounds(el));
            }
            notifyVisibleIndex(el);
        });
    };

    const notifyChanged = (index: number) => {
        if (!props.changed) return;
        ignoredIndex = index;
        props.changed?.(index);
        queueMicrotask(() => {
            if (ignoredIndex === index) ignoredIndex = undefined;
        });
    };

    const notifyVisibleIndex = (el: HTMLElement) => {
        const visibleBounds = getVisibleBounds(el);
        if (!visibleBounds) return;
        const index = Number(visibleBounds.firstVisibleRow.dataset.index);
        if (!Number.isFinite(index)) return;
        notifyChanged(index);
    };

    const queueNotifyVisibleIndex = (el: HTMLElement) => {
        queueMicrotask(() => notifyVisibleIndex(el));
    };

    const settleScroll = (el: HTMLElement) => {
        const currentScrollTop = el.scrollTop;
        if (ignoredScrollTop === currentScrollTop) {
            ignoredScrollTop = undefined;
            return;
        }

        const items = untrack(getItems);
        const visibleBounds = getVisibleBounds(el);
        if (!visibleBounds) return;
        const visibleCount = Math.max(1, visibleBounds.visibleCount);
        const hideItems = Math.max(0, Math.floor(visibleCount / 3));
        const renderCount = Math.max(1, visibleCount + hideItems * 3);
        const currentRows = untrack(getRows);
        const currentStart = untrack(getStart);
        const firstVisibleRow = visibleBounds.firstVisibleRow;
        const firstVisibleIndex = Number(firstVisibleRow.dataset.index);
        if (!Number.isFinite(firstVisibleIndex)) return;

        if (currentRows.length !== renderCount) {
            setVisibleCount(visibleCount);
            setWindow(firstVisibleIndex - hideItems, items, renderCount);
            queueNotifyVisibleIndex(el);
            return;
        }

        setVisibleCount(visibleCount);

        if (!settleWindow(el, currentStart, renderCount, hideItems, firstVisibleIndex, firstVisibleRow)) {
            return;
        }
        settleEdge(el, currentStart, renderCount, items, visibleBounds);
        queueNotifyVisibleIndex(el);
    };

    createTrackedEffect(() => {
        const items = getItems();
        const index = props.index ?? 0;
        if (ignoredIndex === index) {
            ignoredIndex = undefined;
            return;
        }
        setWindowForIndex(index, items);
    });

    useScrollEnd(
        () => getEl(),
        () => {
            const el = getEl();
            if (!el) return;
            settleScroll(el);
        },
    );

    return (
        <div class={styles.listBox} ref={setEl}>
            <For each={getRows()}>{(row) => <div data-index={row.index}>{props.children(row.item, row.index)}</div>}</For>
        </div>
    );
};
