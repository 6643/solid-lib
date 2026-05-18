import "solid-js";

declare module "solid-js" {
  export type { JSX } from "dom-expressions/src/jsx";
}

declare module "solid-js/jsx-runtime" {
  export type { JSX } from "dom-expressions/src/jsx";
  export const Fragment: unknown;
  export const jsx: unknown;
  export const jsxs: unknown;
}

declare module "solid-js/jsx-dev-runtime" {
  export type { JSX } from "dom-expressions/src/jsx";
  export const Fragment: unknown;
  export const jsxDEV: unknown;
}
