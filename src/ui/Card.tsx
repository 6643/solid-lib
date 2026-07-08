import styles from "./Card.module.css";
import type { ComponentProps } from "@solidjs/web";

export type CardProps = ComponentProps<"div">;

export const Card = (props: CardProps) => <div {...props} class={`${styles.card} ${props.class ?? ''}`} />;
