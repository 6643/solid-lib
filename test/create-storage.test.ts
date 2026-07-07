import { afterEach, expect, test } from "bun:test";
import { createRoot } from "solid-js";

import { createStorage } from "../src/utils/createStorage";
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

const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

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
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
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

test("createStorage can persist into sessionStorage", () => {
    const storage = installStorage({ accent: JSON.stringify("#9c27b0") });

    Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: storage,
    });

    let dispose!: () => void;
    const [accent, setAccent] = createRoot((rootDispose) => {
        dispose = rootDispose;
        return createStorage("accent", "teal", globalThis.sessionStorage);
    });

    expect(accent()).toBe("#9c27b0");
    setAccent("#00aa00");
    expect(storage.getItem("accent")).toBe(JSON.stringify("#00aa00"));
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
