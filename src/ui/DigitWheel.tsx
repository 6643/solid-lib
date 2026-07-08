import { createMemo, createSignal, createTrackedEffect, onCleanup, type Accessor, untrack } from "solid-js";
import styles from "./DigitWheel.module.css";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPRING = 0.18;
const FRAME_MS = 16;

const normalizeIndex = (value: number, length: number) => ((value % length) + length) % length;

const resolveDirectionalTarget = (current: number, targetIndex: number, length: number, direction: number) => {
    if (direction < 0) {
        return targetIndex + Math.floor((current - targetIndex) / length) * length;
    }

    return targetIndex + Math.ceil((current - targetIndex) / length) * length;
};

const useSpringNumber = (
    getTarget: Accessor<number>,
    getLength: Accessor<number>,
    getDirection: Accessor<number>,
) => {
    const [value, setValue] = createSignal(0);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let target = 0;
    let initialized = false;

    const stop = () => {
        if (timer) clearTimeout(timer);
        timer = undefined;
    };

    const tick = () => {
        const current = value();
        const delta = target - current;
        if (Math.abs(delta) < 0.001) {
            setValue(target);
            stop();
            return;
        }

        setValue(current + delta * SPRING);
        timer = setTimeout(tick, FRAME_MS);
    };

    createTrackedEffect(() => {
        const length = getLength();
        const nextTarget = getTarget();
        const direction = getDirection();
        const current = untrack(value);
        const resolvedTarget = initialized ? resolveDirectionalTarget(current, nextTarget, length, direction) : nextTarget;
        initialized = true;
        target = resolvedTarget;
        if (!timer) {
            if (current !== resolvedTarget) {
                tick();
            } else {
                setValue(resolvedTarget);
            }
        }
    });

    onCleanup(stop);
    return value;
};

export const DigitWheel = (props: { values: number[]; value: number; direction?: number }) => {
    const values = createMemo(() => (props.values.length > 0 ? props.values : [0]));
    const targetIndex = createMemo(() => Math.max(0, values().indexOf(props.value)));
    const direction = createMemo(() => (props.direction && props.direction < 0 ? -1 : 1));
    const position = useSpringNumber(targetIndex, () => values().length, direction);
    const currentIndex = createMemo(() => Math.floor(position()));
    const nextIndex = createMemo(() => currentIndex() + 1);
    const offset = createMemo(() => `${100 * (position() - currentIndex())}%`);

    return (
        <div class={styles.viewport}>
            <div class={styles.digits} style={{ "--offset": offset() }}>
                <strong class={styles.next} aria-hidden="true">
                    {values()[normalizeIndex(nextIndex(), values().length)]}
                </strong>
                <strong class={styles.current}>{values()[normalizeIndex(currentIndex(), values().length)]}</strong>
            </div>
        </div>
    );
};
