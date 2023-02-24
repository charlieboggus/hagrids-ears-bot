import { Client, Message } from 'discord.js'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'
import { MessageData } from '../api/message-data'
import { SNSClient } from '../clients/sns-client'

export class MessageListener implements Listener {

    private messageBatch: MessageData[] = []

    public attachClient(client: Client, appState: AppState): void {
        client.on('messageCreate', async (receivedMessage) => {
            const snsClient: SNSClient = new SNSClient()
            if (this.isMessageCommand(receivedMessage.content)) {
                const command = receivedMessage.content.slice(1)
                if (command === 'start' && receivedMessage.author.id === process.env.USER_ID) {
                    appState.shouldListen = true
                    Logger.log('Hagrid has started listening')
                    snsClient.publish('Hagrid has started listening')
                }
                else if (command === 'stop' && receivedMessage.author.id === process.env.USER_ID) {
                    appState.shouldListen = false
                    Logger.log('Hagrid has stopped listening')
                    snsClient.publish('Hagrid has stopped listening!')
                }
            }
            else {
                this.handleMessage(receivedMessage, appState)
            }
        })
    }

    private handleMessage(message: Message<boolean>, appState: AppState) {
        if (appState.shouldListen) {
            const messageBatchSize: number = parseInt(process.env.MESSAGE_BATCH_SIZE as string) ?? 10000
            if (this.messageBatch.length > 500) {
                Logger.error('message batch overflow error!')
                this.messageBatch = []
                return
            }

            if (this.messageBatch.length > messageBatchSize) {
                const s3Client: S3Client = new S3Client(process.env.MESSAGE_DATA_BUCKET ?? '')
                s3Client.putObject(JSON.stringify(this.messageBatch))
                Logger.log(`Sent batch to Lambda function: ${JSON.stringify(this.messageBatch)}`)
                this.messageBatch = []
            }
            else {
                // filter out attachments as they won't help us in training our model
                if (message.attachments.size > 0) {
                    Logger.log(`Ignored message as it contains attachment`)
                }
                // filter out urls as well since we don't want to train our model on those
                else if (this.isUrl(message.content)) {
                    Logger.log(`Ignored message as it contains a url`)
                }
                else {
                    const messageData: MessageData = {
                        message: message.content,
                        author: message.author.username
                    }
                    this.messageBatch.push(messageData)
                }
            }
        }
        else {
            Logger.log('Hagrid isnt listening...')
        }
    }

    private isMessageCommand(message: string): boolean {
        switch (message) {
            case "$start":
                return true
            case "$stop":
                return true
            default:
                return false
        }
    }

    private isUrl(message: string): boolean {
        const pattern = new RegExp(
            '^(https?:\\/\\/)?' +                                    // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +    // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' +                         // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +                     // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' +                            // query string
            '(\\#[-a-z\\d_]*)?$', 'i'
        )
        return pattern.test(message)
    }
}