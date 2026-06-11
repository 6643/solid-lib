import styles from "./Input.module.css";
import type { JSX } from "@solidjs/web";

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: InputProps) => (
  <input {...props} class={`${styles.input} ${props.class ?? ""}`} />
);
