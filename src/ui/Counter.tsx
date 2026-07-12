import styles from "./Counter.module.css";
import { createSignal, createMemo, createEffect, For, Show, untrack } from "solid-js";
import { IconButton } from "./Button";
import { icon_remove, icon_add } from "./svgicons";
import { DigitWheel } from "./DigitWheel";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const Counter = (props: {
    value?: number;
    change?: (value: number) => void;
    title?: string;
    min?: number;
    max?: number;
}) => {
    const [getVal, setVal] = createSignal(untrack(() => props.value) ?? 1);
    const getNums = createMemo(() => [...String(Math.abs(getVal()))].map(Number));
    const digitSlots = createMemo(() => Array.from({ length: getNums().length }, (_, i) => i));
    const [getDirection, setDirection] = createSignal(1);

    createEffect(
        () => props.value,
        (external) => {
            if (external !== undefined) setVal(external);
        },
    );

    createEffect(
        () => getVal(),
        (value) => {
            props.change?.(value);
        },
    );

    const increment = () => {
        const currentValue = getVal();
        if (props.max === undefined || currentValue < props.max) {
            setDirection(1);
            setVal(currentValue + 1);
        }
    };

    const decrement = () => {
        const currentValue = getVal();
        if (props.min === undefined || currentValue > props.min) {
            setDirection(-1);
            setVal(currentValue - 1);
        }
    };

    return (
        <div class={styles.counter}>
            <IconButton tap={decrement} icon={icon_remove} />
            <Show when={getVal() < 0}>
                <span>-</span>
            </Show>
            <For each={digitSlots()}>{(i) => <DigitWheel values={DIGITS} value={getNums()[i] ?? 0} direction={getDirection()} />}</For>
            <IconButton tap={increment} icon={icon_add} />
        </div>
    );
};
