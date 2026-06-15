import { createEffect, createRoot, createSignal, For } from "solid-js";
import { createStorage } from "../use/createStorage";
import { IconButton } from "./Button";
import { icon_palette, icon_light_mode, icon_dark_mode } from "./svgicons";
import styles from "./Theme.module.css";

type Theme = "light" | "dark";

const [theme, setTheme] = createStorage<Theme>("theme", "light");
const [accent, setAccent] = createStorage("accent", "teal");

export const initTheme = () =>
    createRoot((dispose) => {
        createEffect(
            () => theme(),
            (current) => document.documentElement.setAttribute("theme", current),
        );
        return dispose;
    });

export const initAccent = () =>
    createRoot((dispose) => {
        createEffect(
            () => accent(),
            (color) => document.documentElement.style.setProperty("--accrnt-color", color),
        );
        return dispose;
    });

export const useTheme = () => [theme, setTheme] as const;
export const useAccent = () => [accent, setAccent] as const;

const accents = [
    { name: "teal", value: "teal" },
    { name: "blue", value: "#2196f3" },
    { name: "purple", value: "#9c27b0" },
    { name: "pink", value: "#e91e63" },
    { name: "red", value: "#f44336" },
    { name: "orange", value: "#ff9800" },
    { name: "green", value: "#4caf50" },
    { name: "indigo", value: "#3f51b5" },
];

const themeIcons = { light: icon_light_mode, dark: icon_dark_mode };

export const ThemeSwitch = () => {
    const [theme, setTheme] = useTheme();
    const toggle = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
    return <IconButton icon={themeIcons[theme()]} tap={toggle} />;
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
            <div class={`${styles.picker} ${open() ? styles.open : ""}`}>
                <For each={accents}>
                    {(item) => (
                        <button
                            onClick={() => setAccent(item.value)}
                            title={item.name}
                            class={`${styles.swatch} ${accent() === item.value ? styles.selected : ""}`}
                            style={{ background: item.value }}
                        />
                    )}
                </For>
            </div>
        </div>
    );
};
