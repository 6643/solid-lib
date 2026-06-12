import styles from "./counter.module.css";
import { createSignal, createMemo, createEffect, For, Show } from "solid-js";
import { IconButton } from "./button";
import { icon_remove, icon_add } from "./svgicons";

export const Counter = (props: {
    value?: number;
    change?: (value: number) => void;
    title?: string;
    min?: number;
    max?: number;
}) => {
    const [getVal, setVal] = createSignal(props.value || 1);
    const [isMoveUp, setMoveUp] = createSignal(false);
    const getNums = createMemo(() => [...String(Math.abs(getVal()))].map(Number));

    createEffect(
        () => getVal(), // compute
        (val) => props.change?.(val), // apply
    );

    const increment =
        props.max !== undefined && getVal() >= props.max
            ? undefined
            : () => {
                  const currentValue = getVal();
                  if (props.max === undefined || currentValue < props.max) {
                      setVal(currentValue + 1);
                      setMoveUp(false);
                  }
              };

    const decrement =
        props.min !== undefined && getVal() <= props.min
            ? undefined
            : () => {
                  const currentValue = getVal();
                  if (props.min === undefined || currentValue > props.min) {
                      setVal(currentValue - 1);
                      setMoveUp(true);
                  }
              };

    return (
        <div class={styles.counter}>
            <IconButton tap={decrement} icon={icon_remove} />
            <Show when={getVal() < 0}>
                <span>-</span>
            </Show>
            <For each={getNums()}>
                {(num) => (
                    <main class={[isMoveUp() ? styles.moveUp : styles.moveDown]}>
                        <div>{isMoveUp() ? num : num + 1 > 9 ? 0 : num + 1}</div>
                        <div>{num}</div>
                        <div>{isMoveUp() ? (num - 1 < 0 ? 9 : num - 1) : num}</div>
                    </main>
                )}
            </For>
            <IconButton tap={increment} icon={icon_add} />
        </div>
    );
};
