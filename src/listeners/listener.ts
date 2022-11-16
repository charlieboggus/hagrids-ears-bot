import { Client } from 'discord.js'

export interface Listener {
    start: (client: Client) => void
}