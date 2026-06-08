import styles from "./Input.module.css";
import type { JSX } from "@solidjs/web";

import { joinClassName } from "./className";

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: InputProps) => (
  <input {...props} class={joinClassName(styles.input, props.class as string | undefined)} />
);
