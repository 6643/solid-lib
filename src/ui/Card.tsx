import styles from "./Card.module.css";
import type { JSX } from "solid-js";

export type CardProps = JSX.HTMLAttributes<HTMLDivElement>;

const joinClassName = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export const Card = (props: CardProps) => (
  <div {...props} class={joinClassName(styles.card, props.class)} />
);
