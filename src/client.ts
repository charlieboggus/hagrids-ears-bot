import { Client, GatewayIntentBits, Partials } from 'discord.js'

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