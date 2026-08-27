import { createEffect, createMemo, type Accessor } from "solid-js";
import { readEl } from "./readEl";

interface GestureOptions {
    threshold?: number;
    delay?: number;
    moveThreshold?: number;
    stopPropagation?: boolean;
    capturePointer?: boolean;
}

interface PointerEventHandlers {
    onPointerDown?: (event: PointerEvent, pointerId: number) => void;
    onPointerMove?: (event: PointerEvent, pointerId: number) => void;
    onPointerUp?: (event: PointerEvent, pointerId: number) => void;
    onPointerCancel?: (event: PointerEvent, pointerId: number) => void;
}

const usePointerEvents = <T extends HTMLElement>(
    ref: T | Accessor<T | undefined>,
    handlersAccessor: Accessor<PointerEventHandlers>,
    capturePointerAccessor: Accessor<boolean> = () => true,
) => {
    createEffect(
        () => ({
            el: readEl(ref),
            handlers: handlersAccessor(),
            capturePointer: capturePointerAccessor(),
        }),
        ({ el, handlers, capturePointer }) => {
            if (!el) return;

            let activePointerId: number | null = null;

            const handlePointerDown = (event: PointerEvent) => {
                if (event.button !== 0) return;
                activePointerId = event.pointerId;
                if (capturePointer) {
                    (event.currentTarget as Element).setPointerCapture(activePointerId);
                }
                handlers.onPointerDown?.(event, activePointerId);
            };

            const handlePointerMove = (event: PointerEvent) => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                handlers.onPointerMove?.(event, activePointerId);
            };

            const handlePointerUp = (event: PointerEvent) => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                handlers.onPointerUp?.(event, activePointerId);
                if (capturePointer) {
                    (event.currentTarget as Element).releasePointerCapture(activePointerId);
                }
                activePointerId = null;
            };

            const handlePointerCancel = (event: PointerEvent) => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                handlers.onPointerCancel?.(event, activePointerId);
                if (capturePointer) {
                    (event.currentTarget as Element).releasePointerCapture(activePointerId);
                }
                activePointerId = null;
            };

            el.addEventListener("pointerdown", handlePointerDown);
            el.addEventListener("pointermove", handlePointerMove);
            el.addEventListener("pointerup", handlePointerUp);
            el.addEventListener("pointercancel", handlePointerCancel);
            el.addEventListener("pointerleave", handlePointerCancel);

            return () => {
                el.removeEventListener("pointerdown", handlePointerDown);
                el.removeEventListener("pointermove", handlePointerMove);
                el.removeEventListener("pointerup", handlePointerUp);
                el.removeEventListener("pointercancel", handlePointerCancel);
                el.removeEventListener("pointerleave", handlePointerCancel);
            };
        },
    );
};

export const useTap = <T extends HTMLElement>(
    element: T,
    valueAccessor: Accessor<[onTap: (event: PointerEvent) => void, options?: GestureOptions]>,
) => {
    let startTimestamp: number | null = null;
    let startX: number | null = null;
    let startY: number | null = null;

    const handlers = createMemo(() => {
        const [onTap, options] = valueAccessor();
        const threshold = options?.threshold ?? 300;
        const moveThreshold = options?.moveThreshold ?? 10;
        const stopPropagation = options?.stopPropagation ?? false;

        return {
            onPointerDown: (event: PointerEvent) => {
                startTimestamp = event.timeStamp;
                startX = event.clientX;
                startY = event.clientY;
            },
            onPointerUp: (event: PointerEvent) => {
                if (
                    startTimestamp !== null &&
                    startX !== null &&
                    startY !== null &&
                    event.timeStamp - startTimestamp < threshold
                ) {
                    const deltaX = event.clientX - startX;
                    const deltaY = event.clientY - startY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                    if (distance < moveThreshold) {
                        if (stopPropagation) {
                            event.stopPropagation();
                        }
                        onTap?.(event);
                    }
                }
                startTimestamp = null;
                startX = null;
                startY = null;
            },
            onPointerCancel: () => {
                startTimestamp = null;
                startX = null;
                startY = null;
            },
        };
    });

    const capturePointer = createMemo(() => {
        const [, options] = valueAccessor();
        return options?.capturePointer ?? true;
    });

    usePointerEvents<T>(element, handlers, capturePointer);
};

export const useLongPress = <T extends HTMLElement>(
    element: T,
    valueAccessor: Accessor<[onLongPress: (event: PointerEvent) => void, options?: GestureOptions]>,
) => {
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let startX: number | null = null;
    let startY: number | null = null;

    const clearTimer = () => {
        if (pressTimer !== null) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    // Solid 2.0: dispose cleanup for timers not owned by pointer-up.
    createEffect(
        () => readEl(element),
        () => {
            return () => clearTimer();
        },
    );

    const handlers = createMemo(() => {
        const [onLongPress, options] = valueAccessor();
        const delay = options?.delay ?? 500;
        const moveThreshold = options?.moveThreshold ?? 10;

        return {
            onPointerDown: (event: PointerEvent) => {
                startX = event.clientX;
                startY = event.clientY;
                clearTimer();
                pressTimer = setTimeout(() => {
                    onLongPress(event);
                    pressTimer = null;
                }, delay);
            },
            onPointerMove: (event: PointerEvent) => {
                if (startX !== null && startY !== null) {
                    const deltaX = event.clientX - startX;
                    const deltaY = event.clientY - startY;
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    if (distance > moveThreshold) {
                        clearTimer();
                    }
                }
            },
            onPointerUp: () => {
                clearTimer();
                startX = null;
                startY = null;
            },
            onPointerCancel: () => {
                clearTimer();
                startX = null;
                startY = null;
            },
        };
    });

    const capturePointer = createMemo(() => {
        const [, options] = valueAccessor();
        return options?.capturePointer ?? true;
    });

    usePointerEvents<T>(element, handlers, capturePointer);
};
