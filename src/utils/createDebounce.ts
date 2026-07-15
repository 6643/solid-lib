export type DebouncedFunction<T extends (...args: any[]) => any> = ((
    ...args: Parameters<T>
) => void) & {
    cancel: () => void;
};

export const createDebounce = <T extends (...args: any[]) => any>(
    fn: T,
    wait: number,
): DebouncedFunction<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn.apply(this, args);
        }, wait);
    } as DebouncedFunction<T>;

    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return debounced;
};
