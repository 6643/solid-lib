import { createEffect } from "solid-js";
import { IconButton } from "./Button";
import { createStorage } from "../use/createStorage";
import { icon_light_mode, icon_dark_mode } from "./svgicons";

type Theme = "light" | "dark";

const icons = { light: icon_light_mode, dark: icon_dark_mode };

export const ThemeToggle = () => {
    const [theme, setTheme] = createStorage<Theme>("theme", "light");

    createEffect(
        () => theme(),
        (current) => document.documentElement.setAttribute("theme", current),
    );

    const toggle = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

    return <IconButton icon={icons[theme()]} tap={toggle} />;
};
