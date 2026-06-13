import { createEffect } from "solid-js";
import { createStorage } from "../use/createStorage";

const presets = [
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

    createEffect(
        () => accent(),
        (color) => {
            document.documentElement.style.setProperty("--accrnt-color", color);
        }
    );

    return (
        <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
            {presets.map(p => (
                <button
                    onClick={() => setAccent(p.value)}
                    title={p.name}
                    style={{
                        width: "24px",
                        height: "24px",
                        "border-radius": "50%",
                        background: p.value,
                        border: accent() === p.value ? "3px solid var(--base-text-color)" : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                    }}
                />
            ))}
        </div>
    );
};
