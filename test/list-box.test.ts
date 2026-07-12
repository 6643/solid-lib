import { expect, test } from "bun:test";
import { join } from "node:path";

const readListBoxSource = () => Bun.file(join(import.meta.dir, "..", "src", "ui", "ListBox.tsx")).text();

test("ListBox keeps virtualization independent from spacer height and transform offset", async () => {
  const source = await readListBoxSource();

  expect(source).not.toContain("getTotalHeight");
  expect(source).not.toContain("translateY");
  expect(source).not.toContain("class={styles.inner}");
  expect(source).not.toContain("class={styles.viewport}");
});

test("ListBox derives visible row count at runtime", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("type ListBoxRow<T> =");
  expect(source).not.toContain("windowCount?: number;");
  expect(source).not.toContain("hideItems?: number;");
  expect(source).not.toContain("visibleItems?: number;");
  expect(source).toContain("const [getVisibleCount, setVisibleCount] = createSignal(8);");
  expect(source).toContain("const getHideItems = () => Math.max(0, Math.floor(getVisibleCount() / 3));");
  expect(source).toContain("const getRenderCount = () => Math.max(1, getVisibleCount() + getHideItems() * 3);");
  expect(source).toContain("<For each={getRows()}>");
  expect(source).toContain("props.children(row.item, row.index)");
  expect(source).not.toContain("windowSize?: number;");
});

test("ListBox shifts the window incrementally instead of replacing every row", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("const appendRows =");
  expect(source).toContain("const prependRows =");
  expect(source).toContain("const snapRowToEdge = (");
  expect(source).toContain("const applyScrollTopOffset = (el: HTMLElement, nextOffset: number | undefined) =>");
  expect(source).toContain("const getVisibleBounds =");
  expect(source).toContain("const firstVisibleRow =");
  expect(source).toContain("const lastVisibleRow =");
  expect(source).toContain("const topHiddenCount =");
  expect(source).toContain("const targetTopHidden = currentStart === 0 ? 0 : hideItems;");
  expect(source).toContain("const settleWindow = (");
  expect(source).toContain("const settleEdge = (");
  expect(source).not.toContain("settleAfterAnchor");
  expect(source).toContain("const delta = topHiddenCount - targetTopHidden;");
  expect(source).toContain("if (delta !== 0) {");
  expect(source).toContain("const snapTarget = getSnapTarget(currentStart, renderCount, items.length, firstVisibleIndex, lastVisibleIndex);");
  expect(source).toContain("snapRowToEdge(el, snapTarget.index, snapTarget.edge);");
  expect(source).toContain("const currentStart = untrack(getStart);");
  expect(source).toContain("shiftWindow(delta, el, firstVisibleRow, renderCount);");
  expect(source).toContain("? appendRows(rows, items, currentStart, amount, renderCount)");
  expect(source).toContain(": prependRows(rows, items, nextStart, amount, renderCount)");
});

test("ListBox uses the visible row bounds as the scroll anchor", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("type VisibleBounds =");
  expect(source).toContain("const getVisibleBounds = (el: HTMLElement): VisibleBounds | undefined =>");
  expect(source).toContain("const containerRect = el.getBoundingClientRect();");
  expect(source).toContain('const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-index]"));');
  expect(source).toContain("rect.bottom > containerRect.top");
  expect(source).toContain("rect.top < containerRect.bottom");
  expect(source).toContain("const firstVisibleRow = visibleRows[0];");
  expect(source).toContain("const lastVisibleRow = visibleRows[visibleRows.length - 1];");
  expect(source).toContain("visibleCount: visibleRows.length");
});

test("ListBox keeps the top anchor row visually stable after shifting the window", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("const getRowEdgeOffset = (el: HTMLElement, index: number, edge: \"top\" | \"bottom\") =>");
  expect(source).toContain("const snapRowToEdge = (");
  expect(source).toContain("const applyScrollTopOffset = (el: HTMLElement, nextOffset: number | undefined) =>");
  expect(source).toContain("const getSnapTarget = (");
  expect(source).toContain('applyScrollTopOffset(el, getRowEdgeOffset(el, index, edge));');
  expect(source).toContain("if (nextOffset === undefined || nextOffset === 0) return;");
  expect(source).toContain("setScrollTopWithoutSettling(el, Math.max(0, el.scrollTop + nextOffset));");
  expect(source).not.toContain("const removedHeight =");
  expect(source).not.toContain("const addedHeight =");
});

test("ListBox ignores scroll events caused by its own scrollTop correction", async () => {
  const source = await readListBoxSource();

  expect(source).toContain('import { useScrollEnd } from "../utils/useScrollEnd";');
  expect(source).toContain("let ignoredScrollTop: number | undefined;");
  expect(source).toContain("useScrollEnd(\n        () => getEl(),\n        () => {");
  expect(source).toContain("const setScrollTopWithoutSettling =");
  expect(source).toContain("ignoredScrollTop = nextScrollTop;");
  expect(source).toContain("if (ignoredScrollTop === currentScrollTop)");
  expect(source).toContain("ignoredScrollTop = undefined;");
  expect(source).toContain("setScrollTopWithoutSettling(el, Math.max(0, el.scrollTop + nextOffset));");
  expect(source).not.toContain("skipNextSettle");
});

test("ListBox keeps props.index as an external jump target", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("changed?: (index: number) => void;");
  expect(source).toContain("index: props.index ?? 0");
  expect(source).toContain("setWindowForIndex(index, items);");
  expect(source).toContain("const start = clampStart(targetIndex, items.length, renderCount);");
  expect(source).toContain("shiftWindowToStart(start, items, renderCount);");
  expect(source).toContain('target?.scrollIntoView({ block: "start" });');
  expect(source).toContain("const previousScrollTop = el.scrollTop;");
  expect(source).toContain("if (el.scrollTop !== previousScrollTop) ignoredScrollTop = el.scrollTop;");
  expect(source).not.toContain("untrack(() => setWindowForIndex(props.index ?? 0, items));");
  expect(source).toContain("createEffect(");
  expect(source).not.toContain("createTrackedEffect");
});

test("ListBox shifts overlapping external index jumps incrementally", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("const shiftWindowToStart = (nextStart: number, items: T[], renderCount: number) =>");
  expect(source).toContain("if (nextStart === currentStart && rows.length === renderCount) return;");
  expect(source).toContain("if (rows.length !== renderCount || amount >= renderCount) {");
  expect(source).toContain("setWindow(nextStart, items, renderCount);");
  expect(source).toContain("? appendRows(rows, items, currentStart, amount, renderCount)");
  expect(source).toContain(": prependRows(rows, items, nextStart, amount, renderCount)");
});

test("ListBox reports internal scroll index changes without feeding them back as external jumps", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("let ignoredIndex: number | undefined;");
  expect(source).toContain("const notifyChanged = (index: number) => {");
  expect(source).toContain("ignoredIndex = index;");
  expect(source).toContain("props.changed?.(index);");
  expect(source).toContain("if (ignoredIndex === index) {");
  expect(source).toContain("ignoredIndex = undefined;");
  expect(source).toContain("const notifyVisibleIndex = (el: HTMLElement) => {");
  expect(source).toContain("notifyChanged(index);");
  expect(source).toContain("queueNotifyVisibleIndex(el);");
});

test("ListBox keeps the bottom anchor row visually stable when nearing the end", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("const items = untrack(getItems);");
  expect(source).toContain('return { index: lastVisibleIndex, edge: "bottom" };');
});

test("ListBox resizes its window from the measured visible row count", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("const visibleCount = Math.max(1, visibleBounds.visibleCount);");
  expect(source).toContain("const hideItems = Math.max(0, Math.floor(visibleCount / 3));");
  expect(source).toContain("const renderCount = Math.max(1, visibleCount + hideItems * 3);");
  expect(source).toContain("if (currentRows.length !== renderCount) {");
  expect(source).toContain("setWindow(firstVisibleIndex - hideItems, items, renderCount);");
});
