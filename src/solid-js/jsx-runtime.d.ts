import type { Element as SolidElement } from "solid-js/types";
import type * as DOMJSX from "dom-expressions/src/jsx";

export namespace JSX {
  export type Element = SolidElement;
  export interface ElementClass extends DOMJSX.JSX.ElementClass {}
  export interface ElementAttributesProperty extends DOMJSX.JSX.ElementAttributesProperty {}
  export interface ElementChildrenAttribute extends DOMJSX.JSX.ElementChildrenAttribute {}
  export interface IntrinsicAttributes extends DOMJSX.JSX.IntrinsicAttributes {}
  export interface IntrinsicElements extends DOMJSX.JSX.IntrinsicElements {}
  export type CSSProperties = DOMJSX.JSX.CSSProperties;
  export type ClassList = DOMJSX.JSX.ClassList;
  export type EventHandler<T, E extends Event> = DOMJSX.JSX.EventHandler<T, E>;
  export type EventHandlerUnion<
    T,
    E extends Event,
    EHandler extends EventHandler<T, any> = EventHandler<T, E>,
  > = DOMJSX.JSX.EventHandlerUnion<T, E, EHandler>;
  export type ButtonHTMLAttributes<T> = DOMJSX.JSX.ButtonHTMLAttributes<T>;
  export type HTMLAttributes<T> = DOMJSX.JSX.HTMLAttributes<T>;
  export type InputHTMLAttributes<T> = DOMJSX.JSX.InputHTMLAttributes<T>;
}

export declare const Fragment: unknown;
export declare const jsx: unknown;
export declare const jsxs: unknown;
