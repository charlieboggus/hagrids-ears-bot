import { Client } from 'discord.js'
import { Logger } from '../util/logger'
import { Listener } from './listener'

class ReadyListener implements Listener {
    public attachClient(client: Client): void {
        client.on('ready', () => {
            if (!client.user || !client.application) {
                return
            }
            Logger.log(`${client.user.username} is online`)
        })
    }
}
export const readyListener = new ReadyListener()