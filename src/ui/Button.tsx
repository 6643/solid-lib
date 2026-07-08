import { createSignal } from "solid-js";
import styles from "./Button.module.css";

import { SvgIcon } from "./SvgIcon";

export type ButtonTapHandler = () => void | Promise<void>;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function";

const invokeButtonTap = async (tap?: ButtonTapHandler) => {
    if (!tap) return;
    const result = tap();
    if (isPromiseLike(result)) {
        await result;
    }
};

const BaseButton = (props: {
    mode: string | undefined;
    style?: {};
    tap?: ButtonTapHandler;
    disabled?: boolean;
    children: any;
}) => {
    const [busy, setBusy] = createSignal(false);
    let btnRef: HTMLButtonElement | undefined;

    const handleClick = async () => {
        if (busy()) return;
        setBusy(true);
        try {
            await invokeButtonTap(props.tap);
        } finally {
            setBusy(false);
        }
        setTimeout(() => {
            const target = btnRef?.closest('[class*="inputWrap"]')?.querySelector("input, textarea");
            if (target) (target as HTMLElement).focus();
        });
    };

    return (
        <button
            ref={btnRef}
            class={[styles.button, props.mode]}
            disabled={props.disabled || busy()}
            onClick={handleClick}
            onMouseDown={(e: Event) => e.preventDefault()}
            type="button"
            style={props.style}
        >
            {props.children}
        </button>
    );
};

export type IconButtonProps = { color?: string; icon: string; tap?: ButtonTapHandler; disabled?: boolean };

export const IconButton = (props: IconButtonProps) => (
    <BaseButton mode={styles.icon} tap={props.tap} disabled={props.disabled} style={{ "--color": props.color }}>
        <SvgIcon name={props.icon} />
    </BaseButton>
);

export type TextButtonProps = {
    color?: string;
    text?: string;
    icon?: string;
    tap?: ButtonTapHandler;
    disabled?: boolean;
    children?: any;
};

export const TextButton = (props: TextButtonProps) => (
    <BaseButton mode={styles.text} tap={props.tap} disabled={props.disabled} style={{ "--color": props.color }}>
        {props.icon && <SvgIcon name={props.icon} />}
        {props.children ?? (props.text ? <span>{props.text}</span> : null)}
    </BaseButton>
);

export type FilledButtonProps = {
    borderRadius?: number | string;
    bgColor?: string;
    color?: string;
    icon?: string;
    text?: string;
    width?: number | string;
    height?: number | string;
    tap?: ButtonTapHandler;
    disabled?: boolean;
    children?: any;
};

export const FilledButton = (props: FilledButtonProps) => (
    <BaseButton
        mode={styles.filled}
        tap={props.tap}
        disabled={props.disabled}
        style={{
            bgColor: props.bgColor,
            borderRadius: props.borderRadius,
            color: props.color,
            height: props.height,
            width: props.width,
        }}
    >
        {props.icon && <SvgIcon name={props.icon} />}
        {props.children ?? (props.text ? <span>{props.text}</span> : null)}
    </BaseButton>
);

export type OutlinedButtonProps = {
    borderRadius?: number | string;
    color?: string;
    width?: number | string;
    height?: number | string;
    icon?: string;
    text?: string;
    disabled?: boolean;
    tap?: ButtonTapHandler;
    children?: any;
};

export const OutlinedButton = (props: OutlinedButtonProps) => (
    <BaseButton
        mode={styles.outlined}
        tap={props.tap}
        disabled={props.disabled}
        style={{
            borderRadius: props.borderRadius,
            color: props.color,
            height: props.height,
            width: props.width,
        }}
    >
        {props.icon && <SvgIcon name={props.icon} />}
        {props.children ?? (props.text ? <span>{props.text}</span> : null)}
    </BaseButton>
);
