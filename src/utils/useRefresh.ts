import styles from "./useRefresh.module.css";
import { createEffect, createMemo, createSignal, type Accessor } from "solid-js";

enum PullState {
    Nil,
    Pulling,
    Ready,
    Loading,
    Done,
}

const REFRESH_THRESHOLD = 80;
const MAX_PULL_HEIGHT = 160;
const PULL_DAMPING_FACTOR = 0.6;
const DONE_ANIMATION_DURATION_MS = 500;

type AsyncVoidFunc = () => Promise<void>;

export const useRefresh = (ref: HTMLElement | Accessor<HTMLElement | undefined>, refresh: AsyncVoidFunc) => {
    createEffect(
        () => (typeof ref === "function" ? ref() : ref),
        (el) => {
            if (!el) return;

            const [getPullHeight, setPullHeight] = createSignal(0);
            const [getPullState, setPullState] = createSignal(PullState.Nil);
            const [getIsPointerCurrentlyDown, setIsPointerCurrentlyDown] = createSignal(false);

            let startY = 0;
            let doneTimer: ReturnType<typeof setTimeout> | undefined;

            const getCurrentIndicatorHeight = createMemo(() => {
                switch (getPullState()) {
                    case PullState.Pulling:
                    case PullState.Ready:
                        return getPullHeight();
                    case PullState.Loading:
                        return REFRESH_THRESHOLD;
                    case PullState.Done:
                    case PullState.Nil:
                    default:
                        return 0;
                }
            });

            const pointerStart = (e: PointerEvent) => {
                if (el.scrollTop === 0 && getPullState() !== PullState.Loading && getPullState() !== PullState.Done) {
                    setIsPointerCurrentlyDown(true);
                    startY = e.clientY;
                    el.setPointerCapture(e.pointerId);
                    setPullState(PullState.Pulling);
                }
            };

            const pointerMove = (e: PointerEvent) => {
                if (!getIsPointerCurrentlyDown() || getPullState() === PullState.Loading || getPullState() === PullState.Done)
                    return;

                const currentY = e.clientY;
                let diffY = currentY - startY;

                if (diffY > 0) {
                    e.preventDefault();

                    diffY = Math.min(diffY, MAX_PULL_HEIGHT);
                    diffY = diffY * PULL_DAMPING_FACTOR;

                    setPullHeight(diffY);

                    if (diffY >= REFRESH_THRESHOLD && getPullState() !== PullState.Ready) {
                        setPullState(PullState.Ready);
                    } else if (diffY < REFRESH_THRESHOLD && getPullState() === PullState.Ready) {
                        setPullState(PullState.Pulling);
                    }
                } else {
                    setPullHeight(0);
                    setPullState(PullState.Nil);
                    setIsPointerCurrentlyDown(false);
                }
            };

            const pointerEnd = (e: PointerEvent) => {
                if (!getIsPointerCurrentlyDown()) return;

                setIsPointerCurrentlyDown(false);
                el.releasePointerCapture(e.pointerId);
                if (getPullHeight() >= REFRESH_THRESHOLD) {
                    setPullState(PullState.Loading);
                    setPullHeight(REFRESH_THRESHOLD);

                    refresh().finally(() => {
                        setPullState(PullState.Done);
                        doneTimer = setTimeout(() => {
                            setPullHeight(0);
                            setPullState(PullState.Nil);
                        }, DONE_ANIMATION_DURATION_MS);
                    });
                } else {
                    setPullHeight(0);
                    setPullState(PullState.Nil);
                }
            };

            createEffect(
                () => getPullState(),
                (state) => {
                    el.classList.toggle(styles.pulling!, state === PullState.Pulling);
                    el.classList.toggle(styles.ready!, state === PullState.Ready);
                    el.classList.toggle(styles.loading!, state === PullState.Loading);
                    el.classList.toggle(styles.done!, state === PullState.Done);
                },
            );

            createEffect(
                () => getCurrentIndicatorHeight(),
                (height) => {
                    el.style.setProperty("--pull-height", height.toString());
                },
            );

            el.classList.add(styles.use_refresh!);
            el.addEventListener("pointerdown", pointerStart);
            el.addEventListener("pointermove", pointerMove);
            el.addEventListener("pointerup", pointerEnd);
            el.addEventListener("pointercancel", pointerEnd);

            return () => {
                if (doneTimer) clearTimeout(doneTimer);
                el.classList.remove(styles.use_refresh!);
                el.removeEventListener("pointerdown", pointerStart);
                el.removeEventListener("pointermove", pointerMove);
                el.removeEventListener("pointerup", pointerEnd);
                el.removeEventListener("pointercancel", pointerEnd);
            };
        },
    );
};
