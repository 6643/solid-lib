export type AsyncVoidFunc = () => Promise<void>
export const isAsyncFunc = (fn: unknown): fn is (...args: any[]) => Promise<any> => Object.prototype.toString.call(fn) === "[object AsyncFunction]"