import { Client, GatewayIntentBits, Partials } from 'discord.js'
import { Listener } from './listeners/listener'
import { readyListener } from './listeners/ready-listener'
import { messageListener } from './listeners/message-listener'
import * as dotenv from 'dotenv'
dotenv.config()


// TODO: figure out the permissions that I actually need and clean these up. It shouldn't be THAT many I really need lol
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.MessageContent,
        67584 // the fuck?
    ],
    partials: [
        Partials.Message, 
        Partials.GuildMember, 
        Partials.User, 
        Partials.Channel
    ]
})

class App {
    constructor(
        private readonly client: Client, 
        private readonly listeners: Listener[]
    ) {}

    public start(): void {
        this.listeners.forEach(listener => {
            listener.attachClient(this.client)
        })
        this.client.login(process.env.DISCORD_TOKEN)
    }
}

const app = new App(client, [
    readyListener, 
    messageListener
])
app.start()