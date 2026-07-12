import styles from "./CountDown.module.css";
import { createMemo, createSignal, onSettled, For, Show, untrack } from "solid-js";
import { DigitWheel } from "./DigitWheel";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const CountDown = (props: {
    value: number;
    done?: VoidFunction;
}) => {
    const [getVal, setVal] = createSignal(untrack(() => props.value));
    const getHms = createMemo(() => parseTime(getVal()));
    const digitSlots = createMemo(() => Array.from({ length: getHms().length }, (_, i) => i));
    const isSplit = (array: number[], index: number) => {
        const length = array.length;
        const isSecondToLast = length >= 2 && index === length - 2;
        const isFourthToLast = length >= 4 && index === length - 4;
        return isSecondToLast || isFourthToLast;
    };

    onSettled(() => {
        const timer = setInterval(() => {
            setVal((current) => {
                if (current <= 0) return 0;
                const next = current - 1;
                if (next === 0) {
                    queueMicrotask(() => props.done?.());
                }
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    });

    return (
        <div class={styles.countdown}>
            <For each={digitSlots()}>
                {(i) => (
                    <>
                        <Show when={isSplit(getHms(), i)}>
                            <span>:</span>
                        </Show>
                        <DigitWheel values={DIGITS} value={getHms()[i] ?? 0} direction={-1} />
                    </>
                )}
            </For>
        </div>
    );
};

function parseTime(totalSeconds: number) {
    if (totalSeconds < 1) return [0, 0, 0, 0, 0];
    const hours = Math.floor(totalSeconds / 3600);
    const remainingAfterHours = totalSeconds % 3600;
    const minutes = Math.floor(remainingAfterHours / 60);
    const seconds = remainingAfterHours % 60;

    const formattedHoursDigits = String(hours).split("").map(Number);
    const formattedMinutesDigits = String(minutes).padStart(2, "0").split("").map(Number);
    const formattedSecondsDigits = String(seconds).padStart(2, "0").split("").map(Number);

    return [...formattedHoursDigits, ...formattedMinutesDigits, ...formattedSecondsDigits];
}
