import styles from "./createTry.module.css"
import { createSignal, For, Show } from "solid-js";
import type { JSX } from "@solidjs/web";



interface Error {
    fnName: string
    args: unknown[]
    info: string
}

// Hook 版本的 useTry
export const createTry = () => {
    const [getErrs, setErrs] = createSignal<Error[]>([]);
    const clearErrs = () => setErrs([]);
    const tryCatch = <T extends unknown[], R>(
        fn: (...args: T) => R | Promise<R>,
        fnName: string
    ) => {
        return async (...args: T): Promise<void> => {
            const addErr = (e: unknown): void => {
                const err = {
                    fnName: fnName,
                    args: args,
                    info: e instanceof Error ? e.message : String(e)
                }
                setErrs((prevErrors) => [...prevErrors, err]);
                console.error(err);
            }

            try {
                await Promise.resolve(fn(...args));
            } catch (e) {
                addErr(e);
            }
        };
    };

    const TryCatch = (props: { children: JSX.Element }) => <Show when={getErrs().length > 0} fallback={props.children}>
        <ul class={styles.useTry}>
            <For each={getErrs()}>
                {({ info }) => <li>{info}</li>}
            </For>
        </ul>
    </Show>

    return { tryCatch, getErrs, clearErrs, TryCatch };
};
