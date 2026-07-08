# ListBox Incremental Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `src/ui/ListBox.tsx` into a fixed-window incremental virtual list with `hideItems` and `visibleItems`, using visible row bounds to shift the window without full re-render on each scroll settle.

**Architecture:** Keep one local row-array state in `ListBox` and update it incrementally with `appendRows` / `prependRows`. Derive the next window from the first and last visible rendered rows after scroll settles, then correct `scrollTop` only enough to keep the anchor row stable. Update the demo to consume the new props and keep the current source-text contract tests aligned with the implementation.

**Tech Stack:** SolidJS, Bun tests, TypeScript, CSS modules.

## Global Constraints

- Do not compute scrollbar height or scrollbar position.
- Do not use spacer height or `translateY` offset virtualization.
- Keep the current `children(item, index)` API.
- Keep the window update incremental: append rows when moving down, prepend rows when moving up.

---

### Task 1: Lock the new ListBox contract in tests

**Files:**
- Modify: `test/list-box.test.ts`

**Interfaces:**
- Consumes: `src/ui/ListBox.tsx` source text.
- Produces: source-text contract checks for `hideItems`, `visibleItems`, fixed render-count math, and incremental settle logic.

- [ ] **Step 1: Write the failing test**

```ts
test("ListBox renders a fixed window from hideItems and visibleItems", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("hideItems?: number;");
  expect(source).toContain("visibleItems?: number;");
  expect(source).toContain("props.visibleItems ?? 20");
  expect(source).toContain("props.hideItems ?? 20");
  expect(source).toContain("visibleItems + hideItems * 3");
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `bun test test/list-box.test.ts`
Expected: FAIL because `ListBox.tsx` still exposes `windowSize` and the old window math.

- [ ] **Step 3: Extend the contract to cover settle behavior**

```ts
test("ListBox settles against visible bounds and shifts incrementally", async () => {
  const source = await readListBoxSource();

  expect(source).toContain("const getVisibleBounds =");
  expect(source).toContain("const firstVisibleRow =");
  expect(source).toContain("const lastVisibleRow =");
  expect(source).toContain("appendRows(");
  expect(source).toContain("prependRows(");
  expect(source).not.toContain("getTotalHeight");
  expect(source).not.toContain("translateY");
});
```

- [ ] **Step 4: Re-run the targeted test and confirm it still fails for the missing implementation**

Run: `bun test test/list-box.test.ts`
Expected: FAIL until `ListBox.tsx` is updated.

- [ ] **Step 5: Keep the test file aligned with the final API**

Remove old `windowSize` assertions once the new contract is in place.

### Task 2: Implement fixed-window incremental virtualization in `src/ui/ListBox.tsx`

**Files:**
- Modify: `src/ui/ListBox.tsx`

**Interfaces:**
- Consumes: `hideItems`, `visibleItems`, current `items`, `filter`, `index`, and `itemHeight`.
- Produces: a row-record array with `visibleItems + hideItems * 3` rendered rows, plus incremental settle logic based on visible row bounds.

- [ ] **Step 1: Write the failing implementation test first**

Use the new contract from Task 1 and keep the component source unchanged until the tests fail for the expected reasons.

- [ ] **Step 2: Implement the minimal API and helpers**

```ts
const getVisibleItems = () => Math.max(1, props.visibleItems ?? 20);
const getHideItems = () => Math.max(0, props.hideItems ?? 20);
const getRenderCount = () => getVisibleItems() + getHideItems() * 3;
```

- [ ] **Step 3: Replace the old `windowSize` window builder**

```ts
const clampStart = (start: number, itemCount: number) => {
  const maxStart = Math.max(0, itemCount - getRenderCount());
  return Math.max(0, Math.min(start, maxStart));
};

const createRows = (items: T[], start: number, count = getRenderCount()) =>
  items.slice(start, start + count).map((item, offset) => ({
    item,
    index: start + offset,
  }));
```

- [ ] **Step 4: Implement visible-bound detection and incremental settle**

```ts
const getVisibleBounds = (el: HTMLElement) => {
  const containerRect = el.getBoundingClientRect();
  const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-index]"));
  const visibleRows = rows.filter((row) => {
    const rect = row.getBoundingClientRect();
    return rect.bottom > containerRect.top && rect.top < containerRect.bottom;
  });

  if (visibleRows.length === 0) return undefined;

  return {
    firstVisibleRow: visibleRows[0],
    lastVisibleRow: visibleRows[visibleRows.length - 1],
  };
};
```

- [ ] **Step 5: Preserve anchor stability while shifting the window**

Use the current row offset before and after the shift, then correct `scrollTop` only enough to keep the anchor row visually stable.

- [ ] **Step 6: Keep self-triggered scroll corrections from looping**

Preserve the `ignoredScrollTop` guard and keep `scroll` settle debounced.

- [ ] **Step 7: Re-run the targeted test**

Run: `bun test test/list-box.test.ts`
Expected: PASS.

### Task 3: Update the demo to the new props

**Files:**
- Modify: `demo/src/pages/DisplayPage.tsx`

**Interfaces:**
- Consumes: `ListBox` with `hideItems` and `visibleItems`.
- Produces: demo page that still renders the virtual list with the new prop names.

- [ ] **Step 1: Rewrite the `ListBox` usage**

```tsx
<ListBox
  items={listItems}
  hideItems={20}
  visibleItems={20}
  index={listIndex()}
  filter={listFilter() ? (item) => item.name.includes(listFilter()) : undefined}
  children={(item) => (
    <div class={styles.listItem}>
      <strong>{item.name}</strong>
      <span>{item.desc}</span>
    </div>
  )}
/>
```

- [ ] **Step 2: Re-run the demo source contract test**

Run: `bun test test/demo-display-page.test.ts`
Expected: PASS.

### Task 4: Verify the workspace against the changed contract

**Files:**
- Verify: `src/ui/ListBox.tsx`, `test/list-box.test.ts`, `demo/src/pages/DisplayPage.tsx`

**Interfaces:**
- Consumes: the updated ListBox API and contract tests.
- Produces: validated build and test output.

- [ ] **Step 1: Run the focused unit tests**

Run: `bun test test/list-box.test.ts test/demo-display-page.test.ts`
Expected: PASS.

- [ ] **Step 2: Run type checking**

Run: `bun x tsc --noEmit --pretty false`
Expected: PASS.

- [ ] **Step 3: Inspect the diff for scope**

Run: `git diff -- src/ui/ListBox.tsx test/list-box.test.ts demo/src/pages/DisplayPage.tsx`
Expected: only the intended ListBox, test, and demo changes.
