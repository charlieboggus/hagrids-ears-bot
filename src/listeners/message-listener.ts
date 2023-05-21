import { Client, Message } from 'discord.js'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'
import { MessageData } from '../api/message-data'
import { loadJsonMap } from '../util/load-json'

export class MessageListener implements Listener {

    private devMode: boolean = false

    private validUsers: Map<string, string> = new Map()

    private messageBatch: MessageData[] = []

    private readonly messageBatchSize: number = parseInt(process.env.MESSAGE_BATCH_SIZE as string) ?? 1000

    private readonly messageBatchOverflow: number = 500

    public attachClient(client: Client, appState: AppState): void {
        this.devMode = appState.devMode
        this.validUsers = loadJsonMap('./users.json')
        client.on('messageCreate', async (receivedMessage) => {
            if (this.isMessageCommand(receivedMessage)) {
                const commandStr: string = receivedMessage.content
                this.processCommand(commandStr, appState)
            }
            else {
                this.processMessage(receivedMessage, appState)
            }
        })
    }

    private isMessageCommand(message: Message<boolean>): boolean {
        if (message.author.id === process.env.ADMIN_USER_ID) {
            switch (message.content) {
                case '$start':
                case '$stop':
                case '$startRecord':
                case '$stopRecord':
                    return true
                default:
                    return false
            }
        }
        return false
    }

    private processCommand (commandStr: string, appState: AppState): void {
        const notify: boolean = !this.devMode
        const command: string = commandStr.slice(1)
        switch (command) {
            case 'start': {
                appState.shouldRecordMessages = true
                Logger.log('Hagrid has started listening', notify)
                break
            }
            case 'stop': {
                appState.shouldRecordMessages = false
                Logger.log('Hagrid has stopped listening', notify)
                break
            }
            case 'startRecord': {
                appState.shouldRecordVoice = true
                Logger.log('Hagrid voice recording enabled', notify)
                break
            }
            case 'stopRecord': {
                appState.shouldRecordVoice = false
                Logger.log('Hagrid voice recording disabled', notify)
                break
            }
            default: {
                break
            }
        }
    }

    private processMessage (message: Message<boolean>, appState: AppState) {
        const notify: boolean = !this.devMode
        if (!appState.shouldRecordMessages) {
            Logger.log('Hagrid is not listening...', notify)
            return
        }
        if (!this.isValidUser(message.author.id)) {
            return
        }
        if (this.messageBatch.length > this.messageBatchOverflow) {
            Logger.error('Message batch overflow', notify)
            this.messageBatch = []
            return
        }
        if (this.messageBatch.length > this.messageBatchSize) {
            if (this.devMode) {
                Logger.log('Application in Development mode... Skipping publishing messages to S3', notify)
            }
            else {
                this.sendMessageBatchToS3()
            }
            this.messageBatch = []
        }
        else {
            if (this.shouldBatchMessage(message)) {
                const messageData: MessageData = {
                    message: message.content,
                    author: message.author.username,
                    authorId: message.author.id
                }
                this.messageBatch.push(messageData)
            }
        }
    }

    private isValidUser (userId: string): boolean {
        return this.validUsers.has(userId)
    }

    private shouldBatchMessage (message: Message<boolean>): boolean {
        return message.attachments.size === 0 && !this.hasUrl(message.content)
    }

    private hasUrl(message: string): boolean {
        const pattern = new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?")
        return pattern.test(message)
    }

    private sendMessageBatchToS3 (): void {
        const s3Client: S3Client = new S3Client(process.env.MESSAGE_DATA_BUCKET ?? '')
        const batchStr: string = JSON.stringify(this.messageBatch)
        s3Client.putTextObject(batchStr)
        const notificationMessage: string = `Sent message batch to S3\nSize: ${this.messageBatch.length}`
        Logger.log(notificationMessage, true)
    }
}