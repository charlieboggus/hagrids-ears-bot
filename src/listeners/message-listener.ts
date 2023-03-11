import { Client, Message } from 'discord.js'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'
import { MessageData } from '../api/message-data'

export class MessageListener implements Listener {

    private messageBatch: MessageData[] = []

    private readonly messageBatchSize: number = parseInt(process.env.MESSAGE_BATCH_SIZE as string) ?? 1000

    private readonly messageBatchOverflowSize: number = 500

    public attachClient(client: Client, appState: AppState): void {
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
                case "$start":
                    return true
                case "$stop":
                    return true
                default:
                    return false
            }
        }
        else {
            return false
        }
    }

    private processCommand (commandStr: string, appState: AppState): void {
        const command: string = commandStr.slice(1)
        switch (command) {
            case 'start': {
                appState.shouldListen = true
                Logger.log('Hagrid has started listening', true)
                break
            }
            case 'stop': {
                appState.shouldListen = false
                Logger.log('Hagrid has stopped listening', true)
                break
            }
            default: {
                break
            }
        }
    }

    private processMessage (message: Message<boolean>, appState: AppState) {
        if (appState.shouldListen) {
            if (this.messageBatch.length > this.messageBatchOverflowSize) {
                Logger.error('message batch overflow error!')
                this.messageBatch = []
                return
            }
            if (this.messageBatch.length > this.messageBatchSize) {
                this.sendMessageBatchToS3()
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
        else {
            Logger.log('Hagrid is not listening...', true)
        }
    }

    private shouldBatchMessage (message: Message<boolean>): boolean {
        return message.attachments.size === 0 && !this.hasUrl(message.content)
    }

    private hasUrl(message: string): boolean {
        const pattern = new RegExp(".*\bhttps?:\/\/\S+.*")
        return pattern.test(message)
    }

    private sendMessageBatchToS3 (): void {
        const s3Client: S3Client = new S3Client(process.env.MESSAGE_DATA_BUCKET ?? '')
        const batchStr: string = JSON.stringify(this.messageBatch)
        s3Client.putObject(batchStr)
        const notificationMessage: string = `Sent message batch to S3:\n\n${batchStr}`
        Logger.log(notificationMessage, true)
    }
}