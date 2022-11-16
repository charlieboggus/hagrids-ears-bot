import { Client } from 'discord.js'
import { Logger } from '../util/logger'
import { Listener } from './listener'

let messageBatch: string[] = []

class MessageListener implements Listener {
    public attachClient (client: Client): void {
        client.on('messageCreate', async (message) => {
            Logger.log(`Received message: ${message.content}`)
            // we want to do shit with recording  messages here... call the firehose? save to s3? we will figure it out
            if (messageBatch.length > 5) {
                messageBatch.forEach(message => {
                })
                // call the lambda here
                messageBatch = []
            }
            else {
                messageBatch.push(message.content)
                Logger.log(`Batched message: ${message.content}`)
            }
        })
    }
}
export const messageListener = new MessageListener()