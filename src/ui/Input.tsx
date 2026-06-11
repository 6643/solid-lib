import styles from "./Input.module.css";
import { createSignal, createEffect, type Component } from "solid-js";

export type RangeInputProps = {
    label: string;
    value?: number;
    changed?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    left?: any;
    right?: any;
};

export const RangeInput: Component<RangeInputProps> = (props) => {
    const [value, setValue] = createSignal(props.value ?? props.min ?? 0);

    createEffect(() => {
        setValue(props.value ?? props.min ?? 0);
    });

    const inputed = (e: Event) => {
        const v = (e.target as HTMLInputElement).valueAsNumber;
        setValue(v);
        props.changed?.(v);
    };

    return (
        <label class={styles.rangeInput}>
            <div>
                <span>{props.label}</span>
                <span data-unit={props.unit}>{value()}</span>
            </div>
            <div>
                {props.left}
                <input
                    type="range"
                    min={props.min ?? 0}
                    max={props.max ?? 100}
                    value={value()}
                    step={props.step ?? 1}
                    onInput={inputed}
                    spellcheck="false"
                    readonly={!props.changed}
                />
                {props.right}
            </div>
        </label>
    );
};

export type StringInputProps = {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    left?: any;
    right?: any;
    validate?: (value: string) => string | undefined;
};

export const StringInput: Component<StringInputProps> = (props) => {
    const [error, setError] = createSignal<string | undefined>();
    const [value, setValue] = createSignal(props.value ?? "");

    createEffect(() => {
        setValue(props.value ?? "");
    });

    createEffect(() => {
        const v = value();
        if (props.validate) setError(props.validate(v));
    });

    const inputed = (e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        setValue(v);
        props.changed?.(v);
    };

    return (
        <label class={`${styles.stringInput} ${error() ? styles.error : ""}`}>
            <div>
                <span>{props.label}</span>
                <span>{error() ?? ""}</span>
            </div>
            <div>
                {props.left}
                <input
                    inputmode="text"
                    value={value()}
                    onInput={inputed}
                    placeholder=" "
                    spellcheck="false"
                    readonly={!props.changed}
                    minlength={props.minLen}
                    maxlength={props.maxLen}
                />
                {props.right}
            </div>
        </label>
    );
};

export type TextInputProps = {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLine?: number;
    maxLine?: number;
    validate?: (value: string) => string | undefined;
};

export const TextInput: Component<TextInputProps> = (props) => {
    const [error, setError] = createSignal<string | undefined>();

    createEffect(() => {
        const v = props.value ?? "";
        if (props.validate) setError(props.validate(v));
    });

    const inputed = (e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        props.changed?.(v);
    };

    return (
        <label class={styles.stringInput}>
            <div>
                <span>{props.label}</span>
                <span>{error() ?? ""}</span>
            </div>
            <textarea
                inputmode="text"
                value={props.value ?? ""}
                onInput={inputed}
                placeholder=" "
                spellcheck="false"
                readonly={!props.changed}
                minlength={props.minLine}
                maxlength={props.maxLine}
            />
        </label>
    );
};
