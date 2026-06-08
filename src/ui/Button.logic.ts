import type { JSX } from "@solidjs/web";

type SizeValue = number | string | undefined;

export type ButtonTapHandler = () => void | Promise<void>;

export type ButtonStyleOptions = {
    bgColor?: string;
    borderRadius?: number | string;
    color?: string;
    height?: number | string;
    width?: number | string;
};

const toCssSize = (value: SizeValue): string | undefined => (typeof value === "number" ? `${value}px` : value);

export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
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
