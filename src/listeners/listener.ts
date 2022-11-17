import { Client } from 'discord.js'
import { AppState } from '../app'

export interface Listener {
    attachClient: (client: Client, appState: AppState) => void
}