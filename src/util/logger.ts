import { SNSClient } from "../clients/sns-client"

const snsClient: SNSClient = new SNSClient()
export class Logger {

    public static log(message: string, notify: boolean = false): void {
        console.log(`[${Date.now().toLocaleString()}][LOG]: ${message}`)
        if (notify) {
            snsClient.publish(message, `[${Date.now().toLocaleString()}][LOG] Hagrid Has something to say`)
        }
    }

    public static error(message: string, notify: boolean = true): void {
        console.log(`[${Date.now().toLocaleString()}][ERROR]: ${message}`)
        if (notify) {
            snsClient.publish(message, `[${Date.now().toLocaleString()}][ERROR] Hagrid has gone deaf!`)
        }
    }
}