import styles from "./Button.module.css";
import { createSignal, type Component, type EventHandlerUnion, type JSX, Show } from "solid-js";

import { SvgIcon } from "./SvgIcon";

type SizeValue = number | string | undefined;

export type ButtonTapHandler = () => void | Promise<void>;

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

type ButtonStyleOptions = Pick<
  SharedButtonProps,
  "bgColor" | "borderRadius" | "color" | "height" | "width"
>;

const joinClassName = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const toCssSize = (value: SizeValue): string | undefined =>
  typeof value === "number" ? `${value}px` : value;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  !!value &&
  (typeof value === "object" || typeof value === "function") &&
  typeof (value as PromiseLike<unknown>).then === "function";

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
  handler: EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined,
  event: MouseEvent & {
    currentTarget: HTMLButtonElement;
    target: Element;
  },
) => {
  if (!handler) {
    return undefined;
  }

  if (Array.isArray(handler)) {
    const [callback, data] = handler as [(data: unknown, event: MouseEvent) => unknown, unknown];
    return callback(data, event);
  }

  return handler(event);
};

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

  const rest = () => {
    const next = { ...props } as Record<string, unknown>;
    delete next.bgColor;
    delete next.borderRadius;
    delete next.children;
    delete next.class;
    delete next.color;
    delete next.disabled;
    delete next.height;
    delete next.icon;
    delete next.onClick;
    delete next.style;
    delete next.tap;
    delete next.text;
    delete next.type;
    delete next.variant;
    delete next.width;
    return next as JSX.ButtonHTMLAttributes<HTMLButtonElement>;
  };

  const buttonStyle = () =>
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

  const isDisabled = () => !!props.disabled || isRunning();

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = async (event) => {
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
      {...rest()}
      aria-busy={isRunning() || undefined}
      class={joinClassName(styles.button, styles[props.variant], props.class)}
      disabled={isDisabled()}
      onClick={handleClick}
      style={buttonStyle()}
      type={props.type ?? "button"}
    >
      <span class={styles.content}>
        <Show when={props.icon}>
          <SvgIcon name={props.icon!} />
        </Show>
        <Show
          fallback={<Show when={props.text}><span>{props.text}</span></Show>}
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

export const IconButton: Component<IconButtonProps> = (props) => (
  <SharedButton {...props} variant="icon" />
);

export type TextButtonProps = SharedButtonProps;

export const TextButton: Component<TextButtonProps> = (props) => (
  <SharedButton {...props} variant="text" />
);

export type FilledButtonProps = SharedButtonProps;

export const FilledButton: Component<FilledButtonProps> = (props) => (
  <SharedButton {...props} variant="filled" />
);

export type OutlinedButtonProps = SharedButtonProps;

export const OutlinedButton: Component<OutlinedButtonProps> = (props) => (
  <SharedButton {...props} variant="outlined" />
);
