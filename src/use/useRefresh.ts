import styles from "./useRefresh.module.css"
import { createEffect, createMemo, createSignal, onSettled, type Accessor } from "solid-js"
import { type AsyncVoidFunc } from "../ui/utils"

// 定义下拉刷新状态枚举
enum PullState {
    Nil,      // 初始/静止状态 (指示器隐藏)
    Pulling,  // 用户正在下拉，但未达到阈值
    Ready,    // 已达到阈值，松开即可刷新
    Loading,  // 刷新操作正在进行中
    Done,     // 刷新操作已完成，回弹中
}

const REFRESH_THRESHOLD = 80
const MAX_PULL_HEIGHT = 160
const PULL_DAMPING_FACTOR = 0.6
const DONE_ANIMATION_DURATION_MS = 500

// The single functional useRefresh hook
export const useRefresh = (
    ref: HTMLElement | Accessor<HTMLElement | undefined>,
    refresh: AsyncVoidFunc
) => {
    createEffect(
        () => typeof ref === "function" ? ref() : ref,  // compute
        (el) => {  // apply
            if (!el) return; // If element is not available, do nothing

            // Inlined core logic from createRefreshHandler
            const [getPullHeight, setPullHeight] = createSignal(0)
            const [getPullState, setPullState] = createSignal(PullState.Nil)
            const [getIsPointerCurrentlyDown, setIsPointerCurrentlyDown] = createSignal(false)

            let startY = 0

            const getCurrentIndicatorHeight = createMemo(() => {
                switch (getPullState()) {
                    case PullState.Pulling:
                    case PullState.Ready:
                        return getPullHeight()
                    case PullState.Loading:
                        return REFRESH_THRESHOLD
                    case PullState.Done:
                    case PullState.Nil:
                    default:
                        return 0
                }
            })


            const pointerStart = (e: PointerEvent) => {
                if (el.scrollTop === 0 && getPullState() !== PullState.Loading && getPullState() !== PullState.Done) {
                    setIsPointerCurrentlyDown(true)
                    startY = e.clientY
                    el.setPointerCapture(e.pointerId)
                    setPullState(PullState.Pulling)
                }
            }

            const pointerMove = (e: PointerEvent) => {
                if (!getIsPointerCurrentlyDown() || getPullState() === PullState.Loading || getPullState() === PullState.Done) return

                const currentY = e.clientY
                let diffY = currentY - startY

                if (diffY > 0) {
                    e.preventDefault()

                    diffY = Math.min(diffY, MAX_PULL_HEIGHT)
                    diffY = diffY * PULL_DAMPING_FACTOR

                    setPullHeight(diffY)

                    if (diffY >= REFRESH_THRESHOLD && getPullState() !== PullState.Ready) {
                        setPullState(PullState.Ready)
                    } else if (diffY < REFRESH_THRESHOLD && getPullState() === PullState.Ready) {
                        setPullState(PullState.Pulling)
                    }
                } else {
                    setPullHeight(0)
                    setPullState(PullState.Nil)
                    setIsPointerCurrentlyDown(false)
                }
            }

            const pointerEnd = (e: PointerEvent) => {
                if (!getIsPointerCurrentlyDown()) return

                setIsPointerCurrentlyDown(false)
                if (el) el.releasePointerCapture(e.pointerId)
                if (getPullHeight() >= REFRESH_THRESHOLD) {
                    setPullState(PullState.Loading)
                    setPullHeight(REFRESH_THRESHOLD)

                    refresh().finally(() => {
                        setPullState(PullState.Done)
                        setTimeout(() => {
                            setPullHeight(0)
                            setPullState(PullState.Nil)
                        }, DONE_ANIMATION_DURATION_MS)
                    })
                } else {
                    setPullHeight(0)
                    setPullState(PullState.Nil)
                }
            }

            createEffect(
                () => getPullState(),  // compute
                (pullState) => {  // apply
                    el.classList.toggle(styles.pulling!, pullState === PullState.Pulling)
                    el.classList.toggle(styles.ready!, pullState === PullState.Ready)
                    el.classList.toggle(styles.loading!, pullState === PullState.Loading)
                    el.classList.toggle(styles.done!, pullState === PullState.Done)
                }
            )

            createEffect(
                () => getCurrentIndicatorHeight(),  // compute
                (height) => el.style.setProperty("--pull-height", height.toString())  // apply
            )

            onSettled(() => {
                el.classList.add(styles.use_refresh!) // Corrected class name
                el.addEventListener("pointerdown", pointerStart)
                el.addEventListener("pointermove", pointerMove)
                el.addEventListener("pointerup", pointerEnd)
                el.addEventListener("pointercancel", pointerEnd)

            })

            return () => {
                el.removeEventListener("pointerdown", pointerStart)
                el.removeEventListener("pointermove", pointerMove)
                el.removeEventListener("pointerup", pointerEnd)
                el.removeEventListener("pointercancel", pointerEnd)
            }
        }
    );
};
