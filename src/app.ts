import { Client } from 'discord.js'
import { discordClient } from './client'
import { Listener } from './listeners/listener'
import { ReadyListener } from './listeners/ready-listener'
import { MessageListener } from './listeners/message-listener'
import { VoiceChannelListener } from './listeners/voice-channel-listener'
import * as dotenv from 'dotenv'
dotenv.config()

export class AppState {
    public shouldRecordMessages: boolean
    public shouldRecordVoice: boolean
    public readonly devMode: boolean
    constructor() {
        this.devMode = process.env.DEVELOPMENT_MODE === 'true'
        this.shouldRecordMessages = false
        this.shouldRecordVoice = false
    }
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
        this.client.login(
            state.devMode ? process.env.DISCORD_TOKEN_TEST : process.env.DISCORD_TOKEN
        )
    }
}

const app = new App(discordClient, [
    new ReadyListener(), 
    new MessageListener(),
    new VoiceChannelListener()
])
app.start(new AppState())