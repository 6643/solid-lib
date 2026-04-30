import styles from "./Input.module.css";
import type { JSX } from "solid-js";

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: InputProps) => (
  <input {...props} class={[styles.input, ...(Array.isArray(props.class) ? props.class : [props.class])]} />
);
