import styles from "./Input.module.css";
import { createSignal, createEffect, createMemo, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import { IconButton } from "./Button";
import { icon_add, icon_remove } from "./svgicons";

// ── 公共类型 ──

type ValidateResult = string | undefined | Promise<string | undefined>;

// ── 公共字段逻辑 ──

const useField = (value: () => string, validate?: (value: string) => ValidateResult) => {
    const [error, setError] = createSignal<string | undefined>();
    const [checking, setChecking] = createSignal(false);
    let seq = 0;

    createEffect(
        () => ({ v: value(), validate }),
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

const Input = (props: {
    label: string;
    value?: string;
    validate?: (value: string) => ValidateResult;
    left?: () => JSX.Element;
    right?: () => JSX.Element;
    children: any;
}) => {
    const { error, checking } = useField(() => props.value ?? "", props.validate);

    return (
        <label class={[styles.field, error() && styles.error]}>
            <div>
                <span>{props.label}</span>
                <span class={styles.fieldError}>{checking() ? "校验中..." : (error() ?? "")}</span>
            </div>
            <div class={styles.inputWrap}>
                {props.left?.()}
                <div class={styles.inputGrow}>{props.children}</div>
                {props.right?.()}
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
    left?: () => JSX.Element;
    right?: () => JSX.Element;
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
                {props.left?.()}
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
                {props.right?.()}
            </div>
        </label>
    );
};

// ── TextInput ──

export const TextInput = (props: {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    left?: () => JSX.Element;
    right?: () => JSX.Element;
    validate?: (value: string) => ValidateResult;
}) => {
    const value = createMemo(() => props.value ?? "");

    return (
        <Input label={props.label} value={props.value} validate={props.validate} left={props.left} right={props.right}>
            <input
                inputmode="text"
                value={value()}
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

// ── TextArea ──

export const TextArea = (props: {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    validate?: (value: string) => ValidateResult;
    row?: number;
    lineNumbers?: boolean;
}) => {
    const row = () => props.row ?? 5;
    const lineNumbers = () => props.lineNumbers ?? true;
    const value = createMemo(() => props.value ?? "");
    let textareaRef: HTMLTextAreaElement | undefined;
    let lineNumRef: HTMLDivElement | undefined;

    const lineCount = () => {
        const v = value();
        return v ? v.split("\n").length : 1;
    };

    const renderLineNumbers = () => {
        const el = lineNumRef;
        if (!el) return;
        const count = lineCount();
        let text = "";
        for (let i = 1; i <= count; i++) text += i + "\n";
        el.innerText = text;
    };

    const syncScroll = () => {
        const ln = lineNumRef;
        const ta = textareaRef;
        if (ln && ta) ln.scrollTop = ta.scrollTop;
    };

    const onInput = (e: InputEvent) => {
        props.changed?.((e.target as HTMLTextAreaElement).value);
        renderLineNumbers();
    };

    createEffect(
        () => value(),
        () => renderLineNumbers(),
    );

    const textarea = (extra: Record<string, unknown>) => (
        <textarea
            inputmode="text"
            value={value()}
            onInput={(e: InputEvent) => props.changed?.((e.target as HTMLTextAreaElement).value)}
            placeholder=" "
            spellcheck={false}
            readonly={!props.changed}
            minlength={props.minLen}
            maxlength={props.maxLen}
            rows={row()}
            {...extra}
        />
    );

    return (
        <Input label={props.label} value={props.value} validate={props.validate}>
            <Show when={lineNumbers()} fallback={textarea({})}>
                <div class={styles.editorWrap}>
                    <div class={styles.lineNumbers} ref={lineNumRef}>
                        1
                    </div>
                    {textarea({ ref: textareaRef, class: styles.editorTextarea, onScroll: syncScroll, onInput })}
                </div>
            </Show>
        </Input>
    );
};

// ── PasswordInput ──

export const PasswordInput = (props: {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    left?: () => JSX.Element;
    right?: () => JSX.Element;
    validate?: (value: string) => ValidateResult;
}) => {
    const value = createMemo(() => props.value ?? "");
    return (
        <Input label={props.label} value={props.value} validate={props.validate} left={props.left} right={props.right}>
            <input
                type="password"
                value={value()}
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

// ── NumberInput ──

export const NumberInput = (props: {
    label: string;
    value?: number;
    changed?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    left?: () => JSX.Element;
    right?: () => JSX.Element;
    validate?: (value: string) => ValidateResult;
}) => {
    const [value, setValue] = createSignal(untrack(() => props.value) ?? 0);

    createEffect(
        () => props.value ?? 0,
        (v) => {
            setValue(v);
        },
    );

    const step = () => props.step ?? 1;

    const clamp = (v: number) => {
        if (props.min != null && v < props.min) return props.min;
        if (props.max != null && v > props.max) return props.max;
        return v;
    };

    const increment = () => {
        if (!props.changed) return;
        const v = clamp(value() + step());
        setValue(v);
        props.changed(v);
    };

    const decrement = () => {
        if (!props.changed) return;
        const v = clamp(value() - step());
        setValue(v);
        props.changed(v);
    };

    const onInput = (e: Event) => {
        const v = (e.target as HTMLInputElement).valueAsNumber;
        setValue(v);
        props.changed?.(v);
    };

    const right = (
        <>
            {props.right?.()}
            <IconButton icon={icon_remove} tap={decrement} />
            <IconButton icon={icon_add} tap={increment} />
        </>
    );

    return (
        <Input
            label={props.label}
            value={String(props.value ?? 0)}
            validate={props.validate}
            left={props.left}
            right={() => right}
        >
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

export const EmailInput = (props: {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    left?: () => JSX.Element;
    right?: () => JSX.Element;
    validate?: (value: string) => ValidateResult;
}) => {
    const value = createMemo(() => props.value ?? "");
    return (
        <Input
            label={props.label}
            value={props.value}
            validate={props.validate ?? ((v: string) => (v && !emailPattern.test(v) ? "邮箱格式不正确" : undefined))}
            left={props.left}
            right={props.right}
        >
            <input
                type="email"
                value={value()}
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

export const TelInput = (props: {
    label: string;
    value?: string;
    changed?: (value: string) => void;
    minLen?: number;
    maxLen?: number;
    left?: () => JSX.Element;
    right?: () => JSX.Element;
    validate?: (value: string) => ValidateResult;
    pattern?: string;
}) => {
    const value = createMemo(() => props.value ?? "");
    return (
        <Input label={props.label} value={props.value} validate={props.validate} left={props.left} right={props.right}>
            <input
                type="tel"
                value={value()}
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
};

// ── CheckButton ──

export const CheckButton = (props: {
    label: string;
    checked?: boolean;
    changed?: (checked: boolean) => void;
    disabled?: boolean;
}) => {
    return (
        <label class={styles.checkBtn}>
            <input
                type="checkbox"
                checked={props.checked ?? false}
                onChange={(e: Event) => props.changed?.((e.target as HTMLInputElement).checked)}
                disabled={props.disabled}
            />
            <span>{props.label}</span>
        </label>
    );
};

// ── RadioButton ──

export const RadioButton = (props: {
    label: string;
    value: string;
    checked?: boolean;
    changed?: (value: string) => void;
    disabled?: boolean;
    name?: string;
}) => {
    return (
        <label class={styles.radioBtn}>
            <input
                type="radio"
                value={props.value}
                checked={props.checked ?? false}
                onChange={() => props.changed?.(props.value)}
                disabled={props.disabled}
                name={props.name}
            />
            <span>{props.label}</span>
        </label>
    );
};
