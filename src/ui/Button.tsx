import styles from "./Button.module.css";
import type { JSX } from "@solidjs/web";
import { createSignal, type Component, Show } from "solid-js";

import {
    createButtonStyle,
    invokeButtonTap,
    isPromiseLike,
    type ButtonTapHandler,
} from "./Button.logic";
import { joinClassName } from "./className";
import { SvgIcon } from "./SvgIcon";

export { createButtonStyle, invokeButtonTap, type ButtonTapHandler } from "./Button.logic";

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

type ButtonVariant = "icon" | "text" | "filled" | "outlined";
type ButtonClickEvent = MouseEvent & {
    currentTarget: HTMLButtonElement;
    target: Element;
};
type BoundButtonClickHandler = {
    0: (data: unknown, event: ButtonClickEvent) => unknown;
    1: unknown;
};

type ButtonInternalProps = keyof (SharedButtonProps & { variant: ButtonVariant });

const BUTTON_INTERNAL_PROPS: ButtonInternalProps[] = [
    "bgColor",
    "borderRadius",
    "children",
    "class",
    "color",
    "disabled",
    "height",
    "icon",
    "onClick",
    "style",
    "tap",
    "text",
    "type",
    "variant",
    "width",
];

const isBoundButtonClickHandler = (handler: unknown): handler is BoundButtonClickHandler =>
    !!handler &&
    typeof handler === "object" &&
    typeof (handler as Partial<BoundButtonClickHandler>)[0] === "function" &&
    1 in handler;

const serializeStyle = (style: JSX.CSSProperties): string =>
    Object.entries(style)
        .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join("; ");

const mergeButtonStyle = (
    style: string | JSX.CSSProperties | undefined,
    buttonStyle: JSX.CSSProperties,
): string | JSX.CSSProperties => {
    if (typeof style === "string") {
        const serialized = serializeStyle(buttonStyle);
        if (!serialized) {
            return style;
        }

        return `${style.trim().replace(/;?$/, ";")} ${serialized}`;
    }

    if (style) {
        return {
            ...(style as JSX.CSSProperties),
            ...buttonStyle,
        };
    }

    return buttonStyle;
};

const invokeClickHandler = (
    handler: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined,
    event: ButtonClickEvent,
) => {
    if (!handler) {
        return undefined;
    }

    if (isBoundButtonClickHandler(handler)) {
        return handler[0](handler[1], event);
    }

    if (typeof handler === "function") {
        return handler(event);
    }

    return undefined;
};

const createButtonRestProps = (
    props: SharedButtonProps & { variant: ButtonVariant },
): JSX.ButtonHTMLAttributes<HTMLButtonElement> => {
    const rest = { ...props };

    for (const key of BUTTON_INTERNAL_PROPS) {
        delete rest[key];
    }

    return rest;
};

const createMergedButtonStyle = (props: SharedButtonProps): string | JSX.CSSProperties =>
    mergeButtonStyle(
        props.style as string | JSX.CSSProperties | undefined,
        createButtonStyle({
            bgColor: props.bgColor,
            borderRadius: props.borderRadius,
            color: props.color,
            height: props.height,
            width: props.width,
        }),
    );

const SharedButton: Component<SharedButtonProps & { variant: ButtonVariant }> = (props) => {
    const [isRunning, setRunning] = createSignal(false);

    const isDisabled = () => !!props.disabled || isRunning();

    const handleClick = async (event: ButtonClickEvent) => {
        const clickResult = invokeClickHandler(props.onClick, event);
        if (isPromiseLike(clickResult)) {
            await clickResult;
        }

        if (event.defaultPrevented || !props.tap || isRunning()) {
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
            {...createButtonRestProps(props)}
            aria-busy={isRunning() ? "true" : undefined}
            class={joinClassName(styles.button, styles[props.variant], props.class as string | undefined)}
            disabled={isDisabled()}
            onClick={handleClick}
            style={createMergedButtonStyle(props)}
            type={props.type ?? "button"}
        >
            <span class={styles.content}>
                <Show when={props.icon}>
                    <SvgIcon name={props.icon!} />
                </Show>
                <Show
                    fallback={
                        <Show when={props.text}>
                            <span>{props.text}</span>
                        </Show>
                    }
                    when={props.children !== undefined}
                >
                    {props.children}
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
