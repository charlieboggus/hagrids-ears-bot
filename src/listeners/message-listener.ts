import { Client, Message } from 'discord.js'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'

let messageBatch: string[] = []

class MessageListener implements Listener {
    public attachClient(client: Client, appState: AppState): void {
        client.on('messageCreate', async (receivedMessage) => {
            if (this.isMessageCommand(receivedMessage.content)) {
                const command = receivedMessage.content.slice(1)
                if (command === 'start') {
                    appState.shouldListen = true
                    Logger.log('Hagrid has started listening')
                }
                else if (command === 'stop') {
                    appState.shouldListen = false
                    Logger.log('Hagrid has stopped listening')
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
            if (messageBatch.length > 500) {
                Logger.error('message batch overflow error!')
                messageBatch = []
                return
            }

            if (messageBatch.length > messageBatchSize) {
                const s3Client: S3Client = new S3Client()
                s3Client.invoke(JSON.stringify(messageBatch))
                Logger.log(`Sent batch to Lambda function: ${messageBatch}`)
                messageBatch = []
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
                    messageBatch.push(message.content)
                    Logger.log(`Batched message: ${message.content}`)
                }
                Logger.log(`Current batch (${messageBatch.length}): ${JSON.stringify(messageBatch)}`)
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
export const messageListener = new MessageListener()