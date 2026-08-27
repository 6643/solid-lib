import styles from "./Modal.module.css";
import { createSignal, createEffect, Show } from "solid-js";
import type { Element } from "solid-js";
import { Portal } from "@solidjs/web";

interface ModalProps {
    children: Element;
    open: boolean;
    class?: string;
    onClose?: VoidFunction;
    width?: string;
    ariaLabel?: string;
}

interface BottomModalProps extends ModalProps {
    height?: string;
}

const BaseModal = (props: ModalProps & { modeClass: string; contentClass?: string; height?: string }) => {
    const [isMounted, setMounted] = createSignal(false);
    const [isAnimating, setAnimating] = createSignal(false);
    const [el, setEl] = createSignal<HTMLDialogElement>();
    let closingTimer: ReturnType<typeof setTimeout> | undefined;

    createEffect(
        () => ({ currentEl: el(), mounted: isMounted() }),
        ({ currentEl, mounted }) => {
            if (!currentEl) return;
            if (mounted && !currentEl.open) currentEl.showModal();
            if (!mounted && currentEl.open) currentEl.close();
        },
    );

    createEffect(
        () => props.open,
        (open) => {
            if (open) {
                clearTimeout(closingTimer);
                setMounted(true);
                queueMicrotask(() => setAnimating(true));
                return;
            }

            setAnimating(false);
            closingTimer = setTimeout(() => setMounted(false), 256);
            return () => clearTimeout(closingTimer);
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

    return (
        <Show when={isMounted()}>
            <Portal>
                <dialog
                    ref={setEl}
                    class={[props.modeClass, styles.modal, { [styles.active!]: isAnimating() }, props.class]}
                    onKeyDown={onKeyDown}
                    onClick={closeDialog}
                    aria-label={props.ariaLabel}
                >
                    <div class={styles.overlay} />
                    <div
                        class={[styles.content, props.contentClass]}
                        style={{ "--max-height": props.height, "--max-width": props.width }}
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
