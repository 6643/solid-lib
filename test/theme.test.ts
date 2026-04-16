import { afterEach, describe, expect, test } from "bun:test";

import {
  getThemeMode,
  initializeThemeMode,
  setDarkTheme,
  setLightTheme,
  setSystemTheme,
  setThemeMode,
} from "../src/ui/theme";

type AttributeValue = string | null;

type FakeMediaChangeEvent = {
  matches: boolean;
};

type FakeMediaChangeListener = (event: FakeMediaChangeEvent) => void;

class FakeDocumentElement {
  private readonly attributes = new Map<string, string>();

  constructor(initialResolvedMode?: string) {
    if (initialResolvedMode) {
      this.attributes.set("data-theme-mode", initialResolvedMode);
    }
  }

  getAttribute(name: string): AttributeValue {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

class FakeStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class FakeMediaQueryList {
  matches: boolean;
  private readonly listeners = new Set<FakeMediaChangeListener>();

  constructor(matches: boolean) {
    this.matches = matches;
  }

  addEventListener(_: "change", listener: FakeMediaChangeListener) {
    this.listeners.add(listener);
  }

  removeEventListener(_: "change", listener: FakeMediaChangeListener) {
    this.listeners.delete(listener);
  }

  dispatch(matches: boolean) {
    this.matches = matches;
    const event = { matches };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const originalDocument = (globalThis as Record<string, unknown>).document;
const originalLocalStorage = (globalThis as Record<string, unknown>).localStorage;
const originalMatchMedia = (globalThis as Record<string, unknown>).matchMedia;

const installDocument = (initialResolvedMode?: string) => {
  const documentElement = new FakeDocumentElement(initialResolvedMode);

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement,
    },
  });

  return documentElement;
};

const installStorage = (initialMode?: string) => {
  const storage = new FakeStorage();
  if (initialMode) {
    storage.setItem("solid-lib:theme-mode", initialMode);
  }

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  return storage;
};

const installMatchMedia = (matches: boolean) => {
  const mediaQueryList = new FakeMediaQueryList(matches);

  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: () => mediaQueryList,
  });

  return mediaQueryList;
};

const restoreGlobals = () => {
  if (typeof originalDocument === "undefined") {
    delete (globalThis as Record<string, unknown>).document;
  } else {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  }

  if (typeof originalLocalStorage === "undefined") {
    delete (globalThis as Record<string, unknown>).localStorage;
  } else {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  }

  if (typeof originalMatchMedia === "undefined") {
    delete (globalThis as Record<string, unknown>).matchMedia;
  } else {
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
  }
};

afterEach(() => {
  restoreGlobals();
});

describe("theme api", () => {
  test("setThemeMode writes the resolved mode to data-theme-mode and persists the preference", () => {
    const documentElement = installDocument();
    const storage = installStorage();
    installMatchMedia(false);

    setThemeMode("dark");

    expect(documentElement.getAttribute("data-theme-mode")).toBe("dark");
    expect(storage.getItem("solid-lib:theme-mode")).toBe("dark");
  });

  test("initializeThemeMode falls back to system and resolves through matchMedia", () => {
    const documentElement = installDocument();
    installStorage();
    installMatchMedia(true);

    const mode = initializeThemeMode();

    expect(mode).toBe("system");
    expect(documentElement.getAttribute("data-theme-mode")).toBe("dark");
    expect(getThemeMode()).toBe("system");
  });

  test("initializeThemeMode restores the persisted mode", () => {
    const documentElement = installDocument();
    installStorage("light");
    installMatchMedia(true);

    const mode = initializeThemeMode();

    expect(mode).toBe("light");
    expect(documentElement.getAttribute("data-theme-mode")).toBe("light");
    expect(getThemeMode()).toBe("light");
  });

  test("setLightTheme and setDarkTheme delegate to the mode api", () => {
    const documentElement = installDocument();
    const storage = installStorage();
    installMatchMedia(true);

    setLightTheme();
    expect(documentElement.getAttribute("data-theme-mode")).toBe("light");
    expect(storage.getItem("solid-lib:theme-mode")).toBe("light");

    setDarkTheme();
    expect(documentElement.getAttribute("data-theme-mode")).toBe("dark");
    expect(storage.getItem("solid-lib:theme-mode")).toBe("dark");
  });

  test("setSystemTheme resolves according to the current system mode", () => {
    const documentElement = installDocument("dark");
    const storage = installStorage("dark");
    installMatchMedia(false);

    setSystemTheme();

    expect(documentElement.getAttribute("data-theme-mode")).toBe("light");
    expect(storage.getItem("solid-lib:theme-mode")).toBe("system");
  });

  test("system mode updates the resolved mode when matchMedia changes", () => {
    const documentElement = installDocument();
    installStorage();
    const mediaQueryList = installMatchMedia(false);

    initializeThemeMode();
    expect(documentElement.getAttribute("data-theme-mode")).toBe("light");

    mediaQueryList.dispatch(true);
    expect(documentElement.getAttribute("data-theme-mode")).toBe("dark");

    mediaQueryList.dispatch(false);
    expect(documentElement.getAttribute("data-theme-mode")).toBe("light");
  });

  test("theme setters do not throw when document, storage, or matchMedia are unavailable", () => {
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).localStorage;
    delete (globalThis as Record<string, unknown>).matchMedia;

    expect(() => initializeThemeMode()).not.toThrow();
    expect(() => setThemeMode("light")).not.toThrow();
    expect(() => setSystemTheme()).not.toThrow();
    expect(() => setLightTheme()).not.toThrow();
    expect(() => setDarkTheme()).not.toThrow();
  });
});
