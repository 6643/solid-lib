import { createSignal, createEffect, onSettled } from "solid-js";

type Theme = "light" | "dark";

/**
 * A SolidJS hook for managing application theme (light/dark).
 * It persists the theme in localStorage and respects the user's OS preference.
 * 
 * @returns An object containing the current theme signal, a function to set the theme,
 * and a function to toggle the theme.
 */
export const useTheme = () => {
    const [theme, setTheme] = createSignal<Theme>("light");

    onSettled(() => {
        const storedTheme = localStorage.getItem("theme") as Theme | null;
        if (storedTheme) {
            setTheme(storedTheme);
        } else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
            setTheme("dark");
        }
    });

    createEffect(
        () => theme(),  // compute
        (currentTheme) => {  // apply
            document.documentElement.setAttribute("theme", currentTheme);
            localStorage.setItem("theme", currentTheme);
        }
    );

    const toggleTheme = () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
    };

    return { theme, setTheme, toggleTheme };
};