import { afterEach, expect, test } from "bun:test";
import { createRoot } from "solid-js";

import { createStorage } from "../src/use/createStorage";
import { initAccent } from "../src/ui/Theme";

class FakeStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string) {
        this.values.set(key, value);
    }
}

const originalLocalStorage = (globalThis as Record<string, unknown>).localStorage;

const installStorage = (initial: Record<string, string> = {}) => {
    const storage = new FakeStorage();
    for (const [key, value] of Object.entries(initial)) {
        storage.setItem(key, value);
    }

    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: storage,
    });

    return storage;
};

afterEach(() => {
    if (typeof originalLocalStorage === "undefined") {
        delete (globalThis as Record<string, unknown>).localStorage;
        return;
    }

    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: originalLocalStorage,
    });
});

test("createStorage reads persisted values during initialization", () => {
    installStorage({ accent: JSON.stringify("#9c27b0") });

    let dispose!: () => void;
    const [accent] = createRoot((rootDispose) => {
        dispose = rootDispose;
        return createStorage("accent", "teal");
    });

    expect(accent()).toBe("#9c27b0");
    dispose();
});

test("initAccent applies the persisted accent immediately", () => {
    installStorage({ accent: JSON.stringify("#9c27b0") });
    const styleCalls: string[] = [];

    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
            documentElement: {
                style: {
                    setProperty(_: string, value: string) {
                        styleCalls.push(value);
                    },
                },
            },
        },
    });

    expect(initAccent()).toBe("#9c27b0");
    expect(styleCalls.at(-1)).toBe("#9c27b0");
});
