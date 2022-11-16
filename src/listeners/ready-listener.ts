import { Client } from 'discord.js'
import { Listener } from './listener'

class ReadyListener implements Listener {
    public start(client: Client): void {
        client.on('ready', () => {
            if (!client.user || !client.application) {
                return
            }
            console.log(`${client.user.username} is online`)
        })
    }
}
export const readyListener = new ReadyListener()