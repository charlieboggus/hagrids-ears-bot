import { Client } from 'discord.js'
import { Listener } from './listener'

class MessageListener implements Listener {
    public start (client: Client): void {
        client.on('messageCreate', async (message) => {
            console.log(message.content)
            // we want to do shit with recording  messages here... call the firehose? save to s3? we will figure it out
        })
    }
}
export const messageListener = new MessageListener()