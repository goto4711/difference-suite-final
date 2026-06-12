export function debug(...args: unknown[]): void {
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        console.debug(...args);
    }
}
