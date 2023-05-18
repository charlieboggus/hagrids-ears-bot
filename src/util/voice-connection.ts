import { VoiceConnection, joinVoiceChannel } from '@discordjs/voice'
import { VoiceBasedChannel } from 'discord.js'

export const createVoiceConnection = (channel: VoiceBasedChannel): VoiceConnection => {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true
    })
    return connection
}
