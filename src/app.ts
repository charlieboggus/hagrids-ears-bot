import { Client } from 'discord.js'
import { discordClient } from './client'
import { Listener } from './listeners/listener'
import { readyListener } from './listeners/ready-listener'
import { messageListener } from './listeners/message-listener'
import * as dotenv from 'dotenv'
dotenv.config()

export class AppState {
    public shouldListen: boolean = false
}

class App {
    constructor(
        private readonly client: Client, 
        private readonly listeners: Listener[]
    ) {}

    public start(state: AppState): void {
        this.listeners.forEach(listener => {
            listener.attachClient(this.client, state)
        })
        this.client.login(process.env.DISCORD_TOKEN)
    }
}

const app = new App(discordClient, [
    readyListener, 
    messageListener
])
app.start(new AppState())