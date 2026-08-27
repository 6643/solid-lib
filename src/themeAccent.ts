import { createStorage } from "./createStorage";

const DEFAULT_ACCENT = "#e95420";
let accentState: ReturnType<typeof createStorage<string>> | undefined;

const applyAccent = (color: string) => {
    try {
        globalThis.document?.documentElement?.style?.setProperty("--accent-color", color);
    } catch {}
};

const getAccentState = () => {
    accentState ??= createStorage("accent", DEFAULT_ACCENT);
    return accentState;
};

export const initAccent = () => {
    const [accent] = getAccentState();
    const currentAccent = accent();
    applyAccent(currentAccent);
    return currentAccent;
};

export const useAccent = () => [
    () => {
        const [accent] = getAccentState();
        return accent();
    },
    (value: string | ((prev: string) => string)) => {
        const [accent, setAccent] = getAccentState();
        const nextAccent = typeof value === "function" ? value(accent()) : value;
        setAccent(nextAccent);
        applyAccent(nextAccent);
        return nextAccent;
    },
] as const;
