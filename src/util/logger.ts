
export class Logger {
    public static log(message: string): void {
        console.log(`[${Date.now().toLocaleString()}][LOG]: ${message}`)
    }

    public static error(message: string): void {
        console.log(`[${Date.now().toLocaleString()}][ERROR]: ${message}`)
    }
}