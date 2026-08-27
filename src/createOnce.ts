export const createOnce = <T extends (...args: any[]) => any>(fn: T): ((...args: Parameters<T>) => ReturnType<T>) => {
    let hasBeenCalled = false;
    let result: ReturnType<T>;

    return function (this: any, ...args: Parameters<T>): ReturnType<T> {
        if (!hasBeenCalled) {
            hasBeenCalled = true;
            result = fn.apply(this, args);
        }
        return result;
    };
};
