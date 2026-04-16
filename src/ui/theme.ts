export type ThemeMode = "system" | "light" | "dark";

type ThemeDocument = {
  documentElement?: {
    getAttribute?: (name: string) => string | null;
    setAttribute?: (name: string, value: string) => void;
  };
};

type ThemeStorage = {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
};

type ThemeMediaChangeEvent = {
  matches: boolean;
};

type ThemeMediaChangeListener = (event: ThemeMediaChangeEvent) => void;

type ThemeMediaQueryList = {
  matches: boolean;
  addEventListener?: (type: "change", listener: ThemeMediaChangeListener) => void;
  removeEventListener?: (type: "change", listener: ThemeMediaChangeListener) => void;
  addListener?: (listener: ThemeMediaChangeListener) => void;
  removeListener?: (listener: ThemeMediaChangeListener) => void;
};

const THEME_MODE_ATTRIBUTE = "data-theme-mode";
const THEME_MODE_STORAGE_KEY = "solid-lib:theme-mode";
const SYSTEM_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const THEME_MODES = new Set<ThemeMode>(["system", "light", "dark"]);

let systemThemeMediaQueryList: ThemeMediaQueryList | undefined;
let systemThemeMediaQueryListener: ThemeMediaChangeListener | undefined;
let currentThemeMode: ThemeMode | undefined;

const getThemeDocument = (): ThemeDocument | undefined =>
  (globalThis as Record<string, unknown>).document as ThemeDocument | undefined;

const getThemeStorage = (): ThemeStorage | undefined =>
  (globalThis as Record<string, unknown>).localStorage as ThemeStorage | undefined;

const getThemeMediaQueryList = (): ThemeMediaQueryList | undefined => {
  const matchMedia = (globalThis as Record<string, unknown>).matchMedia as
    | ((query: string) => ThemeMediaQueryList)
    | undefined;

  return matchMedia?.(SYSTEM_THEME_MEDIA_QUERY);
};

const parseThemeMode = (value: string | null | undefined): ThemeMode | undefined =>
  value && THEME_MODES.has(value as ThemeMode) ? (value as ThemeMode) : undefined;

const readThemeModeFromStorage = (): ThemeMode | undefined =>
  parseThemeMode(getThemeStorage()?.getItem?.(THEME_MODE_STORAGE_KEY));

const writeThemeModeToStorage = (mode: ThemeMode) => {
  getThemeStorage()?.setItem?.(THEME_MODE_STORAGE_KEY, mode);
};

const resolveThemeMode = (): Exclude<ThemeMode, "system"> =>
  getThemeMediaQueryList()?.matches ? "dark" : "light";

const writeResolvedThemeModeToRoot = (mode: Exclude<ThemeMode, "system">) => {
  getThemeDocument()?.documentElement?.setAttribute?.(THEME_MODE_ATTRIBUTE, mode);
};

const detachSystemThemeListener = () => {
  if (!systemThemeMediaQueryList || !systemThemeMediaQueryListener) {
    systemThemeMediaQueryList = undefined;
    systemThemeMediaQueryListener = undefined;
    return;
  }

  systemThemeMediaQueryList.removeEventListener?.("change", systemThemeMediaQueryListener);
  systemThemeMediaQueryList.removeListener?.(systemThemeMediaQueryListener);
  systemThemeMediaQueryList = undefined;
  systemThemeMediaQueryListener = undefined;
};

const attachSystemThemeListener = () => {
  const mediaQueryList = getThemeMediaQueryList();
  detachSystemThemeListener();

  if (!mediaQueryList) {
    return;
  }

  const listener: ThemeMediaChangeListener = (event) => {
    if (currentThemeMode !== "system") {
      return;
    }

    writeResolvedThemeModeToRoot(event.matches ? "dark" : "light");
  };

  mediaQueryList.addEventListener?.("change", listener);
  mediaQueryList.addListener?.(listener);

  systemThemeMediaQueryList = mediaQueryList;
  systemThemeMediaQueryListener = listener;
};

const syncResolvedThemeMode = (mode: ThemeMode) => {
  writeResolvedThemeModeToRoot(mode === "system" ? resolveThemeMode() : mode);
};

export function getThemeMode(): ThemeMode {
  return currentThemeMode ?? readThemeModeFromStorage() ?? "system";
}

export function setThemeMode(mode: ThemeMode) {
  currentThemeMode = mode;
  writeThemeModeToStorage(mode);
  syncResolvedThemeMode(mode);

  if (mode === "system") {
    attachSystemThemeListener();
    return;
  }

  detachSystemThemeListener();
}

export function initializeThemeMode(): ThemeMode {
  const mode = readThemeModeFromStorage() ?? "system";
  currentThemeMode = mode;
  syncResolvedThemeMode(mode);

  if (mode === "system") {
    attachSystemThemeListener();
  } else {
    detachSystemThemeListener();
  }

  return mode;
}

export function setSystemTheme() {
  setThemeMode("system");
}

export function setLightTheme() {
  setThemeMode("light");
}

export function setDarkTheme() {
  setThemeMode("dark");
}
