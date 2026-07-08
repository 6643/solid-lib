import { createMemo, createSignal, createTrackedEffect, onCleanup, untrack, type Accessor } from "solid-js";
import styles from "./DigitWheel.module.css";

const FRAME_MS = 16;
const SPRING = 0.18;

const normalizeIndex = (value: number, length: number) => ((value % length) + length) % length;

const nearestEquivalent = (current: number, targetIndex: number, length: number) => {
    const loop = Math.round((current - targetIndex) / length);
    return targetIndex + loop * length;
};

const useSpringNumber = (getTarget: Accessor<number>, getLength: Accessor<number>) => {
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
        const current = untrack(value);
        const resolvedTarget = initialized ? nearestEquivalent(current, nextTarget, length) : nextTarget;
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

export const DigitWheel = (props: { values: number[]; value: number }) => {
    const values = createMemo(() => (props.values.length > 0 ? props.values : [0]));
    const targetIndex = createMemo(() => Math.max(0, values().indexOf(props.value)));
    const position = useSpringNumber(targetIndex, () => values().length);

    return (
        <div class={styles.viewport}>
            <div
                class={styles.digits}
                style={
                    {
                        "--offset": `${100 * (position() - Math.floor(position()))}%`,
                    } as any
                }
            >
                <strong class={styles.next} aria-hidden="true">
                    {values()[normalizeIndex(Math.floor(position()) + 1, values().length)]}
                </strong>
                <strong class={styles.current}>{values()[normalizeIndex(Math.floor(position()), values().length)]}</strong>
            </div>
        </div>
    );
};
