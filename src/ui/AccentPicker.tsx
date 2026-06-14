import { createSignal, createEffect, For } from "solid-js";
import { IconButton } from "./Button";
import { createStorage } from "../use/createStorage";
import { icon_palette } from "./svgicons";
import styles from "./AccentPicker.module.css";

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

export const AccentPicker = () => {
    const [accent, setAccent] = createStorage("accent", "teal");
    const [open, setOpen] = createSignal(false);

    createEffect(
        () => accent(),
        (color) => document.documentElement.style.setProperty("--accrnt-color", color),
    );

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
