import { Client, GatewayIntentBits, Partials } from 'discord.js'

// TODO: figure out which of these intents and partials I actually need and which I don't
export const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        67584 // the fuck?
    ],
    partials: [
        Partials.Message,
        Partials.GuildMember,
        Partials.User,
        Partials.Channel,
    ]
})