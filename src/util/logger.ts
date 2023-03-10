import { SNSClient } from "../clients/sns-client"

const snsClient: SNSClient = new SNSClient()
export class Logger {

    public static log(message: string, notify: boolean = false): void {
        console.log(`[${Date.now().toString()}][LOG]: ${message}`)
        if (notify) {
            snsClient.publish(message, `[${Date.now().toString()}][LOG] Hagrid Has something to say`)
        }
    }

    public static error(message: string, notify: boolean = true): void {
        console.log(`[${Date.now().toString()}][ERROR]: ${message}`)
        if (notify) {
            snsClient.publish(message, `[${Date.now().toString()}][ERROR] Hagrid has gone deaf!`)
        }
    }
}