import { Client } from 'discord.js'
import { LambdaClient } from '../clients/lambda-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'

let messageBatch: string[] = []

class MessageListener implements Listener {
    public attachClient (client: Client): void {
        client.on('messageCreate', async (message) => {
            Logger.log(`Received message: ${message.content}`)

            // if we can't read the batch size from env we default to a value that we'll never reach so it'll block lambda invocation
            const messageBatchSize: number = parseInt(process.env.MESSAGE_BATCH_SIZE as string) ?? 1000
            Logger.log(`batch size: ${messageBatchSize}`)

            // if something goes wrong and we can't send the message batch we should abort and abandon in order to save memory
            if (messageBatch.length > 500) {
                Logger.error('message batch overflow error!')
                messageBatch = []
                return
            }

            // If all goes well we can proceed to processing batches
            if (messageBatch.length > messageBatchSize) {
                const lambdaClient: LambdaClient = new LambdaClient()
                lambdaClient.invoke(JSON.stringify(messageBatch))
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
            }
        })
    }

    private isUrl(message: string): boolean {
        const pattern = new RegExp(
            '^(https?:\\/\\/)?'+                                    // protocol
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