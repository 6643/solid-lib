import { createSignal } from "solid-js";
import styles from "./Button.module.css";
import type { JSX } from "@solidjs/web";

import { SvgIcon } from "./SvgIcon";

export type ButtonTapHandler = () => void | Promise<void>;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function";

export const invokeButtonTap = async (tap?: ButtonTapHandler) => {
    if (!tap) return;
    const result = tap();
    if (isPromiseLike(result)) {
        await result;
    }
};

const toCssSize = (value: number | string | undefined): string | undefined =>
    typeof value === "number" ? `${value}px` : value;

export const createButtonStyle = (options: {
    bgColor?: string;
    borderRadius?: number | string;
    color?: string;
    height?: number | string;
    width?: number | string;
}): JSX.CSSProperties => {
    const style: JSX.CSSProperties = {};
    const borderRadius = toCssSize(options.borderRadius);
    const height = toCssSize(options.height);
    const width = toCssSize(options.width);

    if (options.bgColor) style["--bg"] = options.bgColor;
    if (borderRadius) style["--radius"] = borderRadius;
    if (options.color) style["--color"] = options.color;
    if (height) style["--height"] = height;
    if (width) style["--width"] = width;

    return style;
};

const BaseButton = (props: {
    mode: string | undefined;
    style?: JSX.CSSProperties;
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
            onMouseDown={(e) => e.preventDefault()}
            type="button"
            style={props.style}
        >
            {props.children}
        </button>
    );
};

export type IconButtonProps = {
    color?: string;
    icon: string;
    tap?: ButtonTapHandler;
    disabled?: boolean;
};

export const IconButton = (props: IconButtonProps) => (
    <BaseButton
        mode={styles.icon}
        tap={props.tap}
        disabled={props.disabled}
        style={props.color ? ({ "--color": props.color } as JSX.CSSProperties) : undefined}
    >
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
    <BaseButton
        mode={styles.text}
        tap={props.tap}
        disabled={props.disabled}
        style={props.color ? ({ "--color": props.color } as JSX.CSSProperties) : undefined}
    >
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
        style={createButtonStyle({
            bgColor: props.bgColor,
            borderRadius: props.borderRadius,
            color: props.color,
            height: props.height,
            width: props.width,
        })}
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
        style={createButtonStyle({
            borderRadius: props.borderRadius,
            color: props.color,
            height: props.height,
            width: props.width,
        })}
    >
        {props.icon && <SvgIcon name={props.icon} />}
        {props.children ?? (props.text ? <span>{props.text}</span> : null)}
    </BaseButton>
);
