import { createMemo, createTrackedEffect, type Accessor } from "solid-js";


interface GestureOptions {
    threshold?: number; // for tap, max duration for a tap
    delay?: number;     // for longPress, min duration for a long press
    moveThreshold?: number; // for tap, max movement allowed for a tap
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
    capturePointerAccessor: Accessor<boolean> = () => true
) => {
    createTrackedEffect(() => {
        const el = typeof ref === "function" ? ref() : ref;
        const handlersAccessorValue = handlersAccessor();
        const capturePointer = capturePointerAccessor();
        if (!el) return;

        let activePointerId: number | null = null;

        const handlePointerDown = (event: PointerEvent) => {
            if (event.button !== 0) return;
            activePointerId = event.pointerId;
            if (capturePointer) {
                (event.currentTarget as Element).setPointerCapture(activePointerId);
            }
            handlersAccessorValue.onPointerDown?.(event, activePointerId);
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (activePointerId === null || event.pointerId !== activePointerId) return;
            handlersAccessorValue.onPointerMove?.(event, activePointerId);
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (activePointerId === null || event.pointerId !== activePointerId) return;
            handlersAccessorValue.onPointerUp?.(event, activePointerId);
            if (capturePointer) {
                (event.currentTarget as Element).releasePointerCapture(activePointerId);
            }
            activePointerId = null;
        };

        const handlePointerCancel = (event: PointerEvent) => {
            if (activePointerId === null || event.pointerId !== activePointerId) return;
            handlersAccessorValue.onPointerCancel?.(event, activePointerId);
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
    });
};

export const useTap = <T extends HTMLElement>(
    element: T, // Tonhe element the directive is 
    valueAccessor: Accessor<[onTap: (event: PointerEvent) => void, options?: GestureOptions]> // The value passed to the directive
) => {
    let startTimestamp: number | null = null;
    let startX: number | null = null;
    let startY: number | null = null;

    // Create a memoized handlers object that reacts to changes in valueAccessor
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
                if (startTimestamp !== null && startX !== null && startY !== null && event.timeStamp - startTimestamp < threshold) {
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
            }
        };
    });

    // Create a memoized accessor for capturePointer
    const capturePointer = createMemo(() => {
        const [, options] = valueAccessor();
        return options?.capturePointer ?? true;
    });

    usePointerEvents<T>(element, handlers, capturePointer);
};




// --- Long Press Gesture ---
export const useLongPress = <T extends HTMLElement>(
    element: T, // The element the directive is on
    valueAccessor: Accessor<[onLongPress: (event: PointerEvent) => void, options?: GestureOptions]> // The value passed to the directive
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
            }
        };
    });

    const capturePointer = createMemo(() => {
        const [, options] = valueAccessor();
        return options?.capturePointer ?? true;
    });

    usePointerEvents<T>(element, handlers, capturePointer);
};
