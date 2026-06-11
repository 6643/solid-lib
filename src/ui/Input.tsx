import styles from "./Input.module.css";
import { createSignal, createEffect } from "solid-js"
import type { JSX } from "@solidjs/web"

export const RangeInput = (props: {
    label: string
    value?: number
    changed?: (value: number) => void
    min?: number
    max?: number
    step?: number
    unit?: string
    left?: JSX.Element
    right?: JSX.Element
}) => {
    const [value, setValue] = createSignal(props.value ?? props.min ?? 0);

    createEffect(
        (prev: number | undefined) => props.value ?? props.min ?? 0,
        (v: number) => { setValue(v) }
    );

    const inputed = (e: Event) => {
        const value = (e.target as HTMLInputElement).valueAsNumber
        setValue(value)
        props.changed?.(value)
    }

    return <label class={styles.rangeInput}>
        <div>
            <span>{props.label}</span>
            <span data-unit={props.unit}>{value()}</span>
        </div>
        <div>
            {props.left}
            <input type="range"
                min={props.min ?? 0}
                max={props.max ?? 100}
                value={value()}
                step={props.step ?? 1}
                onInput={inputed}
                spellcheck={false}
                readonly={!props.changed}
            />
            {props.right}
        </div>
    </label>
}



export const StringInput = (props: {
    label: string
    value?: string
    changed?: (value: string) => void
    minLen?: number
    maxLen?: number
    left?: JSX.Element
    right?: JSX.Element
    validate?: (value: string) => string | undefined
}) => {
    const [error, setError] = createSignal<string | undefined>()
    const [value, setValue] = createSignal(props.value ?? '');

    createEffect(
        (prev: string | undefined) => props.value ?? '',
        (v: string) => { setValue(v) }
    );

    createEffect(
        (prev: { v: string; validate: ((value: string) => string | undefined) | undefined } | undefined) => ({ v: value(), validate: props.validate }),
        ({ v, validate }: { v: string; validate: ((value: string) => string | undefined) | undefined }) => {
            if (validate) setError(validate(v));
        }
    );

    const inputed = (e: Event) => {
        const value = (e.target as HTMLInputElement).value
        setValue(value);
        props.changed?.(value)
    }

    return <label class={`${styles.stringInput} ${error() ? styles.error! : ""}`}>
        <div>
            <span>{props.label}</span>
            <span>{error() ?? ""}</span>
        </div>
        <div>
            {props.left}
            <input inputmode="text"
                value={value()}
                onInput={inputed}
                placeholder=" "
                spellcheck={false}
                readonly={!props.changed}
                minlength={props.minLen}
                maxlength={props.maxLen}
            />
            {props.right}
        </div>

    </label>
}

export const TextInput = (props: {
    label: string
    value?: string
    changed?: (value: string) => void
    minLine?: number
    maxLine?: number
    validate?: (value: string) => string | undefined
}) => {
    const [error, setError] = createSignal<string | undefined>()

    createEffect(
        (prev: { value: string; validate: ((value: string) => string | undefined) | undefined } | undefined) => ({ value: props.value ?? "", validate: props.validate }),
        ({ value, validate }: { value: string; validate: ((value: string) => string | undefined) | undefined }) => {
            if (validate) setError(validate(value))
        }
    )

    const inputed = (e: Event) => {
        const value = (e.target as HTMLInputElement).value
        props.changed?.(value)
    }

    return <label class={styles.stringInput}>
        <div>
            <span>{props.label}</span>
            <span>{error() ?? ""}</span>
        </div>
        <textarea inputmode="text"
            value={props.value ?? ""}
            onInput={inputed}
            placeholder=" "
            spellcheck={false}
            readonly={!props.changed}
            minlength={props.minLine}
            maxlength={props.maxLine}
        />
    </label>
}
