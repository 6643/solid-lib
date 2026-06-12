import styles from "./modal.module.css";
import { createEffect, createSignal, Show, children } from "solid-js";
import { Portal } from "@solidjs/web";



const newModal = (modeClass: string) => {
    const [isActive, setActive] = createSignal(false)

    const Modal = (props: {
        children: any,
        class?: string,
        onClose?: VoidFunction;
    }) => {
        const [isMounted, setMounted] = createSignal(false)
        const [isAnimating, setAnimating] = createSignal(false)

        const [el, setEl] = createSignal<HTMLDialogElement>();
        createEffect(
            () => ({ currentEl: el(), isMounted: isMounted() }),
            ({ currentEl, isMounted }) => {
                if (!currentEl) return;
                if (isMounted && !currentEl.open) currentEl.showModal();
                if (!isMounted && currentEl.open) currentEl.close();
            }
        );

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return
            e.preventDefault()
            setActive(false)
        }
        const closeDialog = (e: Event) => {
            if (e.target === e.currentTarget) setActive(false);
        }

        const getClassName = () => {
            const classes = [styles.modal!, isAnimating() ? styles.active! : ""]
            if (props.class) classes.push(props.class)
            return classes.filter(Boolean).join(" ")
        }

        createEffect(
            () => isActive(),
            (active) => {
                if (active) {
                    setMounted(true);
                    queueMicrotask(() => setAnimating(true));
                } else {
                    setAnimating(false);
                    const timer = setTimeout(() => {
                        setMounted(false)
                        props.onClose?.();
                    }, 256);
                    return () => clearTimeout(timer);
                }
            }
        );

        return <Show when={isMounted()}>
            <Portal>
                <dialog ref={setEl} class={[modeClass, getClassName()]} onKeyDown={onKeyDown} onClick={closeDialog}>
                    {props.children}
                </dialog>
            </Portal>
        </Show>
    }

    return { isActive, setActive, Modal }
};


export const newFilledModal = () => {
    const { isActive, setActive, Modal: FilledModal } = newModal(styles.filled!);
    return { isActive, setActive, FilledModal }
}
export const newBottomModal = () => {
    const { isActive, setActive, Modal: BottomModal } = newModal(styles.bottom!);
    return { isActive, setActive, BottomModal }
}
export const newLeftModal = () => {
    const { isActive, setActive, Modal: LeftModal } = newModal(styles.left!);
    return { isActive, setActive, LeftModal }
}
export const newRightModal = () => {
    const { isActive, setActive, Modal: RightModal } = newModal(styles.right!);
    return { isActive, setActive, RightModal }
}
