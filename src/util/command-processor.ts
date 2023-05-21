import { AppState } from "../app";
import { Logger } from "./logger";

export class CommandProcessor {
    public isMessageCommand(authorId: string, message: string): boolean {
        const adminId: string = process.env.ADMIN_USER_ID ?? ''
        if (authorId === adminId) {
            switch (message) {
                case '$startMessages':
                    return true
                case '$stopMessages':
                    return true
                case '$startVoice':
                    return true
                case '$stopVoice':
                    return true
                default:
                    return false
            }
        }
        return false
    }

    public processCommand(command: string, appState: AppState): void {
        const notify: boolean = !appState.devMode
        switch (command) {
            case '$startMessages': {
                appState.shouldRecordMessages = true
                Logger.log('Hagrid has started listening', notify)
                break
            }
            case '$stopMessages': {
                appState.shouldRecordMessages = false
                Logger.log('Hagrid has stopped listening', notify)
                break
            }
            case '$startVoice': {
                appState.shouldRecordVoice = true
                Logger.log('Hagrid voice recording enabled', notify)
                break
            }
            case '$stopVoice': {
                appState.shouldRecordVoice = false
                Logger.log('Hagrid voice recording disabled', notify)
                break
            }
            default: {
                break
            }
        }
    }
}