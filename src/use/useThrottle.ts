export const useThrottle = <T extends (...args: any[]) => any>(fn: T, wait: number): ((...args: Parameters<T>) => void) => {
    let inThrottle = false;

    return function (this: any, ...args: Parameters<T>): void {
        if (inThrottle) return;

        fn.apply(this, args);
        inThrottle = true;

        setTimeout(() => (inThrottle = false), wait);
    };
};
