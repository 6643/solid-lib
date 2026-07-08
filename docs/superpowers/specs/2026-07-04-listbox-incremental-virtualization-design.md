# ListBox Incremental Virtualization Design

## Goal

Refactor `src/ui/ListBox.tsx` so the virtual list renders a fixed row window:

- top buffer: `hideItems`
- visible rows: `visibleItems`
- bottom buffer: `hideItems * 2`

After scrolling settles, the window should shift based on the first and last visible rendered rows. The implementation must keep incremental row churn and avoid full re-render on every scroll settle.

## Constraints

- Do not compute scrollbar height or scrollbar position.
- Do not use spacer height or `translateY` offset virtualization.
- Keep the current `children(item, index)` API.
- Keep the window update incremental: append rows when moving down, prepend rows when moving up.

## Model

The component maintains a rendered row array and a start index for the first rendered item.

The rendered count is:

`visibleItems + hideItems + hideItems * 2`

The asymmetry is intentional:

- the top buffer is one `hideItems` block
- the bottom buffer is two `hideItems` blocks

This gives extra runway when scrolling downward while still keeping a small fixed render window.

## Scroll Settlement

When scrolling stops:

1. Find the first rendered row that intersects the viewport top.
2. Find the last rendered row that intersects the viewport bottom.
3. Derive the new target window from those visible bounds.
4. Shift the rendered window by the row delta, using row-by-row append/prepend.

The top visible row is the anchor for repositioning. After the window changes, the anchor row must remain visually stable by applying a scrollTop correction based on the anchor row's offset before and after the shift.

## State

Keep a compact local state:

- current rendered start index
- current rendered row records
- current scrollTop guard for self-triggered corrections
- current scroll direction state

No global measurement state is needed.

## Error Handling

- If no rows are visible, keep the current window unchanged.
- If the list is empty, render nothing and skip scroll correction.
- Clamp all derived start indices to valid item bounds.

## Testing

Update `test/list-box.test.ts` to cover:

- the new fixed window size formula
- the `hideItems` / `visibleItems` API
- incremental `appendRows` / `prependRows`
- visible-bounds based settle logic
- the no-spacer / no-transform contract

Behavioral verification should still prefer source-level contract tests for this component because the project already uses that pattern for `ListBox`.
