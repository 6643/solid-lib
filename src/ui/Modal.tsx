import styles from "./Modal.module.css";
import { createEffect, createSignal, Show } from "solid-js";
import { Portal } from "@solidjs/web";

interface ModalProps {
    children: any;
    open: boolean;
    class?: string;
    onClose?: VoidFunction;
    width?: string;
}

interface BottomModalProps extends ModalProps {
    height?: string;
}

const BaseModal = (props: ModalProps & { modeClass: string; contentClass?: string; height?: string }) => {
    const [isMounted, setMounted] = createSignal(false);
    const [isAnimating, setAnimating] = createSignal(false);
    const [el, setEl] = createSignal<HTMLDialogElement>();

    createEffect(
        () => ({ currentEl: el(), isMounted: isMounted() }),
        ({ currentEl, isMounted }) => {
            if (!currentEl) return;
            if (isMounted && !currentEl.open) currentEl.showModal();
            if (!isMounted && currentEl.open) currentEl.close();
        },
    );

    createEffect(
        () => props.open,
        (open) => {
            if (open) {
                setMounted(true);
                queueMicrotask(() => setAnimating(true));
            } else {
                setAnimating(false);
                const timer = setTimeout(() => setMounted(false), 256);
                return () => clearTimeout(timer);
            }
        },
    );

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        props.onClose?.();
    };

    const closeDialog = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest(`.${styles.content}`)) return;
        props.onClose?.();
    };

    const getClassName = () => {
        const classes = [styles.modal!, isAnimating() ? styles.active! : ""];
        if (props.class) classes.push(props.class);
        return classes.filter(Boolean).join(" ");
    };

    return (
        <Show when={isMounted()}>
            <Portal>
                <dialog ref={setEl} class={[props.modeClass, getClassName()]} onKeyDown={onKeyDown} onClick={closeDialog}>
                    <div class={styles.overlay} />
                    <div
                        class={[styles.content, props.contentClass]}
                        style={{ "--modal-height": props.height, "--content-width": props.width }}
                    >
                        {props.children}
                    </div>
                </dialog>
            </Portal>
        </Show>
    );
};

export const BottomModal = (props: BottomModalProps) => <BaseModal {...props} modeClass={styles.bottom!} />;
export const TopModal = (props: ModalProps) => <BaseModal {...props} modeClass={styles.top!} contentClass={styles.center!} />;
export const LeftModal = (props: ModalProps) => <BaseModal {...props} modeClass={styles.left!} contentClass={styles.left!} />;
export const RightModal = (props: ModalProps) => (
    <BaseModal {...props} modeClass={styles.right!} contentClass={styles.right!} />
);
