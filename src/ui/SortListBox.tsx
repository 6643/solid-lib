import styles from "./SortListBox.module.css";
import { createSignal, For, onSettled } from "solid-js";
import type { JSX } from "@solidjs/web";
import { SvgIcon } from "./SvgIcon";
import { icon_drag_handle } from "./svgicons";

type DragState = {
    draggedEl: HTMLElement;
    initialMouseY: number;
    initialIndex: number;
    currentVisualIndex: number;
    itemInitialRects: Map<HTMLElement, DOMRect>;
    avgItemSize: number;
};

const calculateAvgItemSize = (itemRects: Map<HTMLElement, DOMRect>): number => {
    const rects = Array.from(itemRects.values());
    if (rects.length === 0) return 0;
    if (rects.length === 1) return rects[0]!.height;

    const gap = rects[1]!.top - rects[0]!.bottom;
    return rects[0]!.height + gap;
};

export const SortListBox = <T,>(props: {
    items: T[];
    hookChange: (items: T[], oldIndex: number, newIndex: number) => void;
    renderItem: (item: T, index: number) => JSX.Element;
    actions?: (item: T, index: number) => JSX.Element;
}) => {
    let containerEl!: HTMLDivElement;
    const [dragState, setDragState] = createSignal<DragState | null>(null);

    const handlePointerDown = (e: PointerEvent) => {
        if (e.button !== 0 || !e.isPrimary) return;

        const target = e.target as HTMLElement;
        const dragHandle = target.closest<HTMLElement>(`.${styles.itemActions}>:last-child`);
        if (!dragHandle) return;

        const draggedEl = dragHandle.closest<HTMLElement>(`.${styles.listItem}`);
        if (!draggedEl) return;

        e.preventDefault();

        const listItems = Array.from(containerEl.children) as HTMLElement[];
        const initialIndex = listItems.indexOf(draggedEl);
        if (initialIndex === -1) return;

        const itemInitialRects = new Map<HTMLElement, DOMRect>();
        listItems.forEach((item) => {
            itemInitialRects.set(item, item.getBoundingClientRect());
            if (item !== draggedEl) {
                item.classList.add(styles.displaced!);
            }
        });

        const avgItemSize = calculateAvgItemSize(itemInitialRects);

        setDragState({
            draggedEl,
            initialIndex,
            currentVisualIndex: initialIndex,
            initialMouseY: e.clientY,
            itemInitialRects,
            avgItemSize,
        });

        draggedEl.classList.add(styles.dragging!);

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);
    };

    const handlePointerMove = (e: PointerEvent) => {
        const state = dragState();
        if (!state) return;

        const { draggedEl, initialMouseY, initialIndex, avgItemSize, currentVisualIndex, itemInitialRects } = state;

        const itemCount = itemInitialRects.size;
        const deltaY = e.clientY - initialMouseY;

        const minDeltaY = -initialIndex * avgItemSize;
        const maxDeltaY = (itemCount - 1 - initialIndex) * avgItemSize;
        const clampedDeltaY = Math.max(minDeltaY, Math.min(deltaY, maxDeltaY));

        draggedEl.style.setProperty("--translate-y", `${clampedDeltaY}px`);

        if (avgItemSize <= 0) return;

        const newVisualIndex = initialIndex + Math.round(deltaY / avgItemSize);
        const clampedNewIndex = Math.max(0, Math.min(newVisualIndex, itemCount - 1));

        if (clampedNewIndex !== currentVisualIndex) {
            updateSiblingTransforms(state, clampedNewIndex);
            setDragState((s) => ({ ...s!, currentVisualIndex: clampedNewIndex }));
        }
    };

    const handlePointerUp = () => {
        const state = dragState();
        if (!state) return;

        cleanUpDrag();

        const { initialIndex, currentVisualIndex } = state;

        if (currentVisualIndex !== initialIndex) {
            const newItems = [...props.items];
            const [movedItem] = newItems.splice(initialIndex, 1);
            newItems.splice(currentVisualIndex, 0, movedItem!);
            props.hookChange(newItems, initialIndex, currentVisualIndex);
        }

        Promise.resolve().then(() => {
            if (!containerEl) return;
            const listItems = Array.from(containerEl.children) as HTMLElement[];
            listItems.forEach((item) => {
                item.style.removeProperty("--translate-y");
                item.classList.remove(styles.dragging!, styles.displaced!);
            });
        });
    };

    const updateSiblingTransforms = (state: DragState, newVisualIndex: number) => {
        const { draggedEl, initialIndex, avgItemSize } = state;
        const listItems = Array.from(containerEl.children) as HTMLElement[];

        listItems.forEach((item, i) => {
            if (item === draggedEl) return;

            let translateY = 0;
            if (initialIndex < newVisualIndex) {
                if (i > initialIndex && i <= newVisualIndex) {
                    translateY = -avgItemSize;
                }
            } else if (initialIndex > newVisualIndex) {
                if (i >= newVisualIndex && i < initialIndex) {
                    translateY = avgItemSize;
                }
            }
            item.style.setProperty("--translate-y", `${translateY}px`);
        });
    };

    const cleanUpDrag = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        setDragState(null);
    };

    onSettled(() => cleanUpDrag);

    return (
        <div class={styles.sort_list_box} ref={containerEl} onPointerDown={handlePointerDown}>
            <For each={props.items}>
                {(item, index) => (
                    <div class={styles.listItem}>
                        {props.renderItem(item, index())}
                        <div class={styles.itemActions}>
                            {props.actions?.(item, index())}
                            <SvgIcon name={icon_drag_handle} />
                        </div>
                    </div>
                )}
            </For>
        </div>
    );
};
