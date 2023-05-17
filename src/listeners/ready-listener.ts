import { Client } from 'discord.js'
import { AppState } from '../app'
import { Logger } from '../util/logger'
import { Listener } from './listener'

export class ReadyListener implements Listener {
    public attachClient(client: Client, appState: AppState): void {
        client.on('ready', () => {
            if (!client.user || !client.application) {
                return
            }
            const notify: boolean = appState.devMode ? false : true
            Logger.log(`${client.user.username} is online`, notify)
        })
    }
}
