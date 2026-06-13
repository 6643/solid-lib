import styles from "./Card.module.css";
import type { JSX } from "@solidjs/web";

export type CardProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Card = (props: CardProps) => <div {...props} class={[styles.card, props.class] as any} />;
