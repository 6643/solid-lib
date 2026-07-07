export type ThemeMode = "light" | "dark" | "system";

type MediaQueryListWithLegacy = MediaQueryList & {
    addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const STORAGE_KEY = "solid-lib:theme-mode";
const ATTRIBUTE_NAME = "data-theme-mode";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

let currentThemeMode: ThemeMode = "system";
let currentResolvedThemeMode: "light" | "dark" = "light";
let stopSystemThemeSync: (() => void) | undefined;

const readStorage = (): ThemeMode | undefined => {
    try {
        const value = globalThis.localStorage?.getItem(STORAGE_KEY);
        if (value === "light" || value === "dark" || value === "system") return value;
    } catch {}

    return undefined;
};

const writeStorage = (mode: ThemeMode) => {
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, mode);
    } catch {}
};

const setResolvedTheme = (resolvedTheme: "light" | "dark") => {
    currentResolvedThemeMode = resolvedTheme;

    try {
        globalThis.document?.documentElement?.setAttribute(ATTRIBUTE_NAME, resolvedTheme);
    } catch {}
};

const resolveSystemTheme = (): "light" | "dark" => {
    try {
        return globalThis.matchMedia?.(MEDIA_QUERY).matches ? "dark" : "light";
    } catch {
        return "light";
    }
};

const stopListeningSystemTheme = () => {
    stopSystemThemeSync?.();
    stopSystemThemeSync = undefined;
};

const startListeningSystemTheme = () => {
    stopListeningSystemTheme();

    let mediaQueryList: MediaQueryListWithLegacy;
    try {
        const candidate = globalThis.matchMedia?.(MEDIA_QUERY);
        if (!candidate) return;
        mediaQueryList = candidate as MediaQueryListWithLegacy;
    } catch {
        return;
    }

    const listener = (event: MediaQueryListEvent) => {
        if (currentThemeMode !== "system") return;
        setResolvedTheme(event.matches ? "dark" : "light");
    };

    let removeListener: (() => void) | undefined;

    try {
        mediaQueryList.addEventListener("change", listener);
        removeListener = () => {
            mediaQueryList.removeEventListener("change", listener);
        };
    } catch {}

    try {
        mediaQueryList.addListener?.(listener);
        const removeLegacyListener = () => {
            mediaQueryList.removeListener?.(listener);
        };

        if (removeListener) {
            removeLegacyListener();
        } else {
            removeListener = removeLegacyListener;
        }
    } catch {
        if (!removeListener) {
            removeListener = undefined;
        }
    }

    stopSystemThemeSync = removeListener;
};

const applyThemeMode = (mode: ThemeMode): ThemeMode => {
    currentThemeMode = mode;
    writeStorage(mode);

    if (mode === "system") {
        setResolvedTheme(resolveSystemTheme());
        startListeningSystemTheme();
        return mode;
    }

    stopListeningSystemTheme();
    setResolvedTheme(mode);
    return mode;
};

export const getThemeModeCore = (): ThemeMode => currentThemeMode;
export const getResolvedThemeModeCore = (): "light" | "dark" => currentResolvedThemeMode;
export const setThemeModeCore = (mode: ThemeMode): ThemeMode => applyThemeMode(mode);
export const initializeThemeModeCore = (): ThemeMode => {
    const savedThemeMode = readStorage() ?? "system";
    return applyThemeMode(savedThemeMode);
};
export const setSystemThemeCore = (): ThemeMode => setThemeModeCore("system");
export const setLightThemeCore = (): ThemeMode => setThemeModeCore("light");
export const setDarkThemeCore = (): ThemeMode => setThemeModeCore("dark");

export const getThemeMode = getThemeModeCore;
export const getResolvedThemeMode = getResolvedThemeModeCore;
export const setThemeMode = setThemeModeCore;
export const initializeThemeMode = initializeThemeModeCore;
export const setSystemTheme = setSystemThemeCore;
export const setLightTheme = setLightThemeCore;
export const setDarkTheme = setDarkThemeCore;
