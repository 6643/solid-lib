import styles from "./Button.module.css";
import { createSignal, type Component, type JSX, Show } from "solid-js";

import { SvgIcon } from "./SvgIcon";

type SizeValue = number | string | undefined;

export type ButtonTapHandler = () => void | Promise<void>;

export type SharedButtonProps = {
    bgColor?: string;
    borderRadius?: number | string;
    color?: string;
    height?: number | string;
    disabled?: boolean;
    icon?: string;
    tap?: ButtonTapHandler;
    text?: string;
    width?: number | string;
};

type ButtonVariant = "icon" | "text" | "filled" | "outlined";

type ButtonStyleOptions = Pick<SharedButtonProps, "bgColor" | "borderRadius" | "color" | "height" | "width">;

const toCssSize = (value: SizeValue): string | undefined => (typeof value === "number" ? `${value}px` : value);

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function";

export const createButtonStyle = (options: ButtonStyleOptions): JSX.CSSProperties => {
    const style: JSX.CSSProperties = {};
    const borderRadius = toCssSize(options.borderRadius);
    const height = toCssSize(options.height);
    const width = toCssSize(options.width);

    if (borderRadius) {
        style["--button-border-radius"] = borderRadius;
    }

    if (options.color) {
        style["--button-color"] = options.color;
    }

    if (options.bgColor) {
        style["--button-bg-color"] = options.bgColor;
    }

    if (height) {
        style["--button-height"] = height;
    }

    if (width) {
        style["--button-width"] = width;
    }

    return style;
};

export const invokeButtonTap = async (tap?: ButtonTapHandler) => {
    if (!tap) {
        return;
    }

    const result = tap();
    if (isPromiseLike(result)) {
        await result;
    }
};

const SharedButton: Component<SharedButtonProps & { variant: ButtonVariant }> = (props) => {
    const [isRunning, setRunning] = createSignal(false);

    const buttonStyle = () =>
        createButtonStyle({
            bgColor: props.bgColor,
            borderRadius: props.borderRadius,
            color: props.color,
            height: props.height,
            width: props.width,
        });

    const isDisabled = () => !!props.disabled || !props.tap || isRunning();

    const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = async (event) => {
        if (props.disabled || !props.tap || isRunning()) {
            return;
        }

        setRunning(true);
        try {
            await invokeButtonTap(props.tap);
        } finally {
            setRunning(false);
        }
    };

    return (
        <button
            aria-busy={isRunning() ? "true" : undefined}
            class={[styles.button, styles[props.variant]]}
            disabled={isDisabled()}
            onClick={handleClick}
            style={buttonStyle()}
            type="button"
        >
            <span class={styles.content}>
                <Show when={props.icon}>
                    <SvgIcon name={props.icon!} />
                </Show>
                <Show when={props.text}>
                    <span>{props.text}</span>
                </Show>
            </span>
        </button>
    );
};

export type IconButtonProps = Omit<SharedButtonProps, "text"> & {
    icon: string;
    text?: never;
};

export const IconButton: Component<IconButtonProps> = (props) => <SharedButton {...props} variant="icon" />;

export type TextButtonProps = SharedButtonProps;

export const TextButton: Component<TextButtonProps> = (props) => <SharedButton {...props} variant="text" />;

export type FilledButtonProps = SharedButtonProps;

export const FilledButton: Component<FilledButtonProps> = (props) => <SharedButton {...props} variant="filled" />;

export type OutlinedButtonProps = SharedButtonProps;

export const OutlinedButton: Component<OutlinedButtonProps> = (props) => <SharedButton {...props} variant="outlined" />;
