import styles from "./Card.module.css";
import type { JSX } from "solid-js";

export type CardProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Card = (props: CardProps) => (
  <div {...props} class={[styles.card, ...(Array.isArray(props.class) ? props.class : [props.class])]} />
);
