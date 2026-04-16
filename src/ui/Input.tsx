import styles from "./Input.module.css";
import type { JSX } from "solid-js";

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

const joinClassName = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export const Input = (props: InputProps) => (
  <input {...props} class={joinClassName(styles.input, props.class)} />
);
