import styles from "./Card.module.css";
import type { JSX } from "solid-js";

import { joinClassName } from "./className";

export type CardProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Card = (props: CardProps) => (
  <div {...props} class={joinClassName(styles.card, props.class as string | undefined)} />
);
