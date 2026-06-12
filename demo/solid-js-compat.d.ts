declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
        interface ElementChildrenAttribute {
            children: {};
        }
    }
}

declare module "solid-js/jsx-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
        interface ElementChildrenAttribute {
            children: {};
        }
    }
    export const Fragment: symbol;
    export function jsx(type: any, props: any, ...rest: any[]): any;
    export function jsxs(type: any, props: any, ...rest: any[]): any;
}

declare module "solid-js/jsx-dev-runtime" {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
        interface ElementChildrenAttribute {
            children: {};
        }
    }
    export const Fragment: symbol;
    export function jsxDEV(type: any, props: any, ...rest: any[]): any;
}
