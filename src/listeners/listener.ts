import { Client } from 'discord.js'

export interface Listener {
    attachClient: (client: Client) => void
}