import { createSignal, For } from "solid-js";
import { createStorage } from "../utils/createStorage";
import { IconButton } from "./Button";
import { icon_palette, icon_light_mode, icon_dark_mode } from "./svgicons";
import styles from "./Theme.module.css";
import { getResolvedThemeMode, initializeThemeMode, setThemeMode, type ThemeMode } from "./themeMode";

const [themeMode, setThemeModeSignal] = createSignal<ThemeMode>("system");
let accentState: ReturnType<typeof createStorage<string>> | undefined;

const applyAccent = (color: string) => {
    try {
        globalThis.document?.documentElement?.style?.setProperty("--accent-color", color);
    } catch {}
};

const getAccentState = () => {
    accentState ??= createStorage("accent", "#e95420");
    return accentState;
};

export const initTheme = () => {
    const mode = initializeThemeMode();
    setThemeModeSignal(mode);
    return mode;
};

export const initAccent = () => {
    const [accent] = getAccentState();
    const currentAccent = accent();
    applyAccent(currentAccent);
    return currentAccent;
};

export const useTheme = () => [
    themeMode,
    (value: ThemeMode | ((prev: ThemeMode) => ThemeMode)) => {
        const nextMode = typeof value === "function" ? value(themeMode()) : value;
        const appliedThemeMode = setThemeMode(nextMode);
        setThemeModeSignal(appliedThemeMode);
        return appliedThemeMode;
    },
] as const;

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

const accents = [
    { name: "teal", value: "teal" },
    { name: "blue", value: "#2196f3" },
    { name: "purple", value: "#9c27b0" },
    { name: "pink", value: "#e91e63" },
    { name: "red", value: "#f44336" },
    { name: "orange", value: "#e95420" },
    { name: "green", value: "#4caf50" },
    { name: "indigo", value: "#3f51b5" },
];

const themeIcons = { light: icon_light_mode, dark: icon_dark_mode };

export const ThemeSwitch = () => {
    const [theme, setTheme] = useTheme();
    const resolvedTheme = () => getResolvedThemeMode();
    const toggle = () => {
        setTheme(resolvedTheme() === "dark" ? "light" : "dark");
    };
    return <IconButton icon={themeIcons[resolvedTheme()]} tap={toggle} />;
};

export const AccentSelector = () => {
    const [accent, setAccent] = useAccent();
    const [open, setOpen] = createSignal(false);

    return (
        <div class={styles.root}>
            <IconButton
                icon={icon_palette}
                tap={() => {
                    setOpen((v) => !v);
                }}
            />
            <div class={[styles.picker, { [styles.open!]: open() }]}>
                <For each={accents}>
                    {(item) => (
                        <button
                            type="button"
                            onClick={() => setAccent(item.value)}
                            title={item.name}
                            class={[styles.swatch, { [styles.selected!]: accent() === item.value }]}
                            style={{ background: item.value }}
                        />
                    )}
                </For>
            </div>
        </div>
    );
};

export const ThemeToggle = ThemeSwitch;
export const AccentPicker = AccentSelector;
