import styles from "./Input.module.css";
import { createSignal, createEffect, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";

// ── 公共 props ──

type ValidateResult = string | undefined | Promise<string | undefined>;

interface FieldProps {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    left?: JSX.Element;
    right?: JSX.Element;
    validate?: (value: string) => ValidateResult;
}

// ── 公共字段逻辑 ──

const useField = (props: FieldProps) => {
    const [error, setError] = createSignal<string | undefined>();
    const [checking, setChecking] = createSignal(false);
    let seq = 0;

    createEffect(
        () => ({ v: props.value ?? "", validate: props.validate }),
        ({ v, validate }) => {
            if (!validate) {
                setError(undefined);
                return;
            }

            const id = ++seq;
            const result = validate(v);

            if (result instanceof Promise) {
                setChecking(true);
                result
                    .then((msg) => {
                        if (id === seq) setError(msg);
                    })
                    .finally(() => {
                        if (id === seq) setChecking(false);
                    });
            } else {
                setError(result);
            }
        },
    );

    return { error, checking };
};

// ── 公共字段包装 ──

const Input = (props: FieldProps & { children: any }) => {
    const { error, checking } = useField(props);

    return (
        <label class={[styles.field, error() && styles.error]}>
            <div>
                <span>{props.label}</span>
                <span class={styles.fieldError}>{checking() ? "校验中..." : (error() ?? "")}</span>
            </div>
            <div class={styles.inputWrap}>
                {props.left && <span class={styles.iconBtn}>{props.left}</span>}
                {props.children}
                {props.right && <span class={styles.iconBtn}>{props.right}</span>}
            </div>
        </label>
    );
};

// ── RangeInput ──

export const RangeInput = (props: {
    label: string;
    value?: number;
    changed?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    left?: JSX.Element;
    right?: JSX.Element;
}) => {
    const [value, setValue] = createSignal(untrack(() => props.value) ?? untrack(() => props.min) ?? 0);

    createEffect(
        () => props.value ?? props.min ?? 0,
        (v) => {
            setValue(v);
        },
    );

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
                    spellcheck={false}
                    readonly={!props.changed}
                />
                {props.right}
            </div>
        </label>
    );
};

// ── TextInput (row=1 → input, row>1 → textarea) ──

export const TextInput = (props: FieldProps & { row?: number }) => {
    const row = () => props.row ?? 1;

    return (
        <Input {...props}>
            <Show
                when={row() > 1}
                fallback={
                    <input
                        inputmode="text"
                        value={props.value ?? ""}
                        onInput={(e: InputEvent) => props.changed?.((e.target as HTMLInputElement).value)}
                        placeholder=" "
                        spellcheck={false}
                        readonly={!props.changed}
                        minlength={props.minLen}
                        maxlength={props.maxLen}
                    />
                }
            >
                <textarea
                    inputmode="text"
                    value={props.value ?? ""}
                    onInput={(e: InputEvent) => props.changed?.((e.target as HTMLTextAreaElement).value)}
                    placeholder=" "
                    spellcheck={false}
                    readonly={!props.changed}
                    minlength={props.minLen}
                    maxlength={props.maxLen}
                    rows={row()}
                />
            </Show>
        </Input>
    );
};

// ── PasswordInput ──

export const PasswordInput = (props: FieldProps) => (
    <Input {...props}>
        <input
            type="password"
            value={props.value ?? ""}
            onInput={(e: InputEvent) => props.changed?.((e.target as HTMLInputElement).value)}
            placeholder=" "
            spellcheck={false}
            readonly={!props.changed}
            minlength={props.minLen}
            maxlength={props.maxLen}
        />
    </Input>
);

// ── NumberInput ──

export const NumberInput = (
    props: FieldProps & {
        min?: number;
        max?: number;
        step?: number;
        unit?: string;
    },
) => {
    const [value, setValue] = createSignal(untrack(() => props.value) ?? "");

    createEffect(
        () => props.value ?? "",
        (v) => {
            setValue(v);
        },
    );

    const onInput = (e: Event) => {
        const v = (e.target as HTMLInputElement).value;
        setValue(v);
        props.changed?.(v);
    };

    return (
        <Input {...props}>
            <input
                type="number"
                value={value()}
                onInput={onInput}
                placeholder=" "
                spellcheck={false}
                readonly={!props.changed}
                min={props.min}
                max={props.max}
                step={props.step}
            />
        </Input>
    );
};

// ── EmailInput ──

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailInput = (props: FieldProps) => {
    const merged: FieldProps = {
        ...props,
        validate: props.validate ?? ((v) => (v && !emailPattern.test(v) ? "邮箱格式不正确" : undefined)),
    };

    return (
        <Input {...merged}>
            <input
                type="email"
                value={props.value ?? ""}
                onInput={(e: InputEvent) => props.changed?.((e.target as HTMLInputElement).value)}
                placeholder=" "
                spellcheck={false}
                readonly={!props.changed}
                minlength={props.minLen}
                maxlength={props.maxLen}
            />
        </Input>
    );
};

// ── TelInput ──

export const TelInput = (props: FieldProps & { pattern?: string }) => (
    <Input {...props}>
        <input
            type="tel"
            value={props.value ?? ""}
            onInput={(e: InputEvent) => props.changed?.((e.target as HTMLInputElement).value)}
            placeholder=" "
            spellcheck={false}
            readonly={!props.changed}
            pattern={props.pattern}
            minlength={props.minLen}
            maxlength={props.maxLen}
        />
    </Input>
);
