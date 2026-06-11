export type AsyncVoidFunc = () => Promise<void>
export const isAsyncFunc = (fn: unknown): fn is Promise<boolean> => Object.prototype.toString.call(fn) === "[object AsyncFunction]"