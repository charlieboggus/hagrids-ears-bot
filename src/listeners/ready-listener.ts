import { Client } from 'discord.js'
import { AppState } from '../app'
import { Logger } from '../util/logger'
import { Listener } from './listener'

export class ReadyListener implements Listener {
    public attachClient(client: Client, _appState: AppState): void {
        client.on('ready', () => {
            if (!client.user || !client.application) {
                return
            }
            Logger.log(`${client.user.username} is online`)
        })
    }
}
