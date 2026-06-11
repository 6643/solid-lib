import styles from "./Button.module.css";
import type { JSX } from "@solidjs/web";
import { createSignal, type Component, Show } from "solid-js";
import { SvgIcon } from "./SvgIcon";

export type ButtonTapHandler = () => void | Promise<void>;

type ButtonVariant = "icon" | "text" | "filled" | "outlined";

export type SharedButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
    bgColor?: string;
    borderRadius?: number | string;
    color?: string;
    height?: number | string;
    icon?: string;
    tap?: ButtonTapHandler;
    text?: string;
    width?: number | string;
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function";

const SharedButton: Component<SharedButtonProps & { variant: ButtonVariant }> = (props) => {
    const [isRunning, setRunning] = createSignal(false);

    const style = (): JSX.CSSProperties =>
        ({
            "--border-radius": props.borderRadius != null ? `${props.borderRadius}` : undefined,
            "--bg-color": props.bgColor,
            "--color": props.color,
            "--height": props.height != null ? `${props.height}` : undefined,
            "--width": props.width != null ? `${props.width}` : undefined,
        }) as JSX.CSSProperties;

    const isDisabled = () => !!props.disabled || isRunning();

    const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = async (event) => {
        if (typeof props.onClick === "function") {
            props.onClick(event);
        }

        if (event.defaultPrevented || !props.tap || isRunning()) {
            return;
        }

        setRunning(true);
        try {
            const result = props.tap();
            if (isPromiseLike(result)) {
                await result;
            }
        } finally {
            setRunning(false);
        }
    };

    return (
        <button
            {...props}
            aria-busy={isRunning() ? "true" : undefined}
            class={`${styles.button} ${styles[props.variant]} ${props.class ?? ""}`}
            disabled={isDisabled()}
            onClick={handleClick}
            style={style()}
            type={props.type ?? "button"}
        >
            <Show when={props.icon}>
                <SvgIcon name={props.icon!} />
            </Show>
            <Show when={props.text}>
                <span>{props.text}</span>
            </Show>
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
