/**
 * Async primitive for SolidJS 2.0 - replaces createResource-based implementation.
 * Provides createAsync and createAsyncStore for async data fetching.
 */
import { type Accessor, createRoot, createSignal, createEffect, type Setter, untrack } from "solid-js";
import { createStore, reconcile, type ReconcileOptions, snapshot } from "solid-js/store";
import { isServer } from "solid-js/web";

export type AccessorWithLatest<T> = {
    (): T;
    latest: T;
}

export const createAsync = <T>(fn: (prev: T | undefined) => Promise<T>, options?: { name?: string; initialValue?: T; deferStream?: boolean; }): AccessorWithLatest<T | undefined> => {
    const [getValue, setValue] = createSignal<T | undefined>(options?.initialValue);
    let latestValue: T | undefined = options?.initialValue;

    createEffect(
        () => subFetch(fn, latestValue),
        async (promise) => {
            if (!promise) return;
            try {
                const result = await promise;
                latestValue = result;
                setValue(() => result);
            } catch (e) {
                console.error("createAsync error:", e);
            }
        }
    );

    const resultAccessor: AccessorWithLatest<T | undefined> = (() => getValue()) as any;
    Object.defineProperty(resultAccessor, 'latest', {
        get() {
            return latestValue;
        }
    });

    return resultAccessor;
}

export const createAsyncStore = <T>(fn: (prev: T | undefined) => Promise<T>, options: { name?: string; initialValue?: T; deferStream?: boolean; reconcile?: ReconcileOptions; } = {}): AccessorWithLatest<T | undefined> => {
    const [store, setStore] = createStore<{ value: T | undefined }>({
        value: options?.initialValue
    });
    let latestValue: T | undefined = options?.initialValue;

    createEffect(
        () => subFetch(fn, latestValue ? snapshot(latestValue) : undefined),
        async (promise) => {
            if (!promise) return;
            try {
                const result = await promise;
                latestValue = result;
                setStore("value", reconcile(structuredClone(result), options.reconcile));
            } catch (e) {
                console.error("createAsyncStore error:", e);
            }
        }
    );

    const resultAccessor: AccessorWithLatest<T | undefined> = (() => store.value) as any;
    Object.defineProperty(resultAccessor, 'latest', {
        get() {
            return latestValue;
        }
    });

    return resultAccessor;
}

// mock promise while hydrating to prevent fetching
const MockPromise = Object.assign((() => ({
    catch: () => MockPromise(),
    then: () => MockPromise(),
    finally: () => MockPromise(),
})) as any, {
    all: () => MockPromise(),
    allSettled: () => MockPromise(),
    any: () => MockPromise(),
    race: () => MockPromise(),
    reject: () => MockPromise(),
    resolve: () => MockPromise(),
});

const subFetch = <T>(fn: (prev: T | undefined) => Promise<T>, prev: T | undefined): Promise<T> | undefined => {
    if (isServer || !(globalThis as any).sharedConfig?.context) return fn(prev);
    const ogFetch = globalThis.fetch;
    const ogPromise = Promise;
    try {
        globalThis.fetch = (() => new MockPromise()) as any;
        globalThis.Promise = MockPromise as any;
        return fn(prev);
    } finally {
        globalThis.fetch = ogFetch;
        globalThis.Promise = ogPromise;
    }
}
