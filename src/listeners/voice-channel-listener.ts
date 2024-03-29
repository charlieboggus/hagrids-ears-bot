import { Client, GuildMember, VoiceBasedChannel, VoiceState } from 'discord.js'
import { UserVoiceSessionData } from '../api/user-voice-session-data'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'
import { VoiceReceiver, getVoiceConnection, joinVoiceChannel } from '@discordjs/voice'
import { loadJsonMap } from '../util/load-json'
import { EndBehaviorType } from '@discordjs/voice'
import * as prism from 'prism-media'
const MemoryStream = require('memorystream')

export class VoiceChannelListener implements Listener {

    private devMode: boolean = false

    private userCount: number = 0

    private validUsers: Map<string, string> = new Map()
    
    private voiceSession: Map<string, UserVoiceSessionData> = new Map()

    public attachClient(client: Client, appState: AppState): void {
        this.devMode = appState.devMode
        this.validUsers = loadJsonMap('./voice-users.json')
        client.on('voiceStateUpdate', async (oldState, newState) => {
            this.handleVoiceStateChange(oldState, newState, appState)
        })
    }

    private handleVoiceStateChange(oldState: VoiceState, newState: VoiceState, appState: AppState): void {
        if (!oldState.channelId) { // user joins voice chat
            if (newState.member) {
                this.userJoinVoice(newState, appState)
            }
        }
        if (!newState.channelId) { // user leaves voice chat
            if (oldState.member) {
                this.userLeaveVoice(oldState)
            }
        }
        if (oldState.channelId && // user changes voice chat channels
            newState.channelId !== oldState.channelId) {
        }
    }

    private userJoinVoice(voiceState: VoiceState, appState: AppState): void {
        if (!voiceState.member) {
            return
        }
        const user: GuildMember = voiceState.member
        const userId: string = user.id
        const displayName: string = user.displayName
        if (!this.voiceSession.has(displayName)) {
            this.userCount++
            this.addUserToVoiceSession(userId, displayName)
        }
        if (this.userCount === 1 && appState.shouldRecordVoice) {
            const channel = voiceState.channel
            if (channel) {
                this.createBotVoiceConnection(channel)
            }
        }
    }

    private addUserToVoiceSession(userId: string, displayName: string): void {
        const userSessionData: UserVoiceSessionData = {
            joinedTimestamp: Date.now(),
            leaveTimestamp: -1,
            userId: userId,
            userDisplayName: displayName
        }
        this.voiceSession.set(displayName, userSessionData)
    }

    private createBotVoiceConnection(channel: VoiceBasedChannel) {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true
        })
        const receiver = connection.receiver
        receiver.speaking.on('start', userId => {
            if (this.validUsers.has(userId)) {
                this.recordUser(receiver, userId)
            }
        })
    }

    private recordUser(receiver: VoiceReceiver, userId: string): void {
        const audioStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 1000
            }
        })
        const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 })
        const memStream = new MemoryStream(null, { readable: false })
        const stream = audioStream.pipe(decoder).pipe(memStream)
        stream.on('finish', () => {
            const s3ObjectName: string = `${userId}/recording-${userId}-${Date.now()}.pcm`
            const fileData: Buffer = Buffer.concat(memStream.queue)
            this.uploadVoiceRecordingToS3(s3ObjectName, fileData)
        })
    }

    private uploadVoiceRecordingToS3(objectName: string, data: Buffer): void {
        try {
            const s3Client: S3Client = new S3Client(process.env.VOICE_RECORDING_BUCKET ?? '')
            s3Client.putFile(data, objectName)
            Logger.log(`Successfully uploaded voice recording to S3: ${objectName}`, false)
        }
        catch (err) {
            Logger.error(`Error thrown when attempting to upload voice recording to S3: ${err}`, !this.devMode)
        }
    }

    private userLeaveVoice(voiceState: VoiceState): void {
        if (!voiceState.member) {
            return
        }
        const user: GuildMember = voiceState.member
        const displayName: string = user.displayName
        this.removeUserFromVoiceSession(displayName)
        if (this.userCount === 1) {
            const channel = voiceState.channel
            if (channel) {
                this.disconnectBotFromVoice(channel)
            }
        }
        if (this.userCount === 0) {
            this.sendVoiceSessionDataToS3()
        }
    }

    private removeUserFromVoiceSession(displayName: string): void {
        const userSessionData: UserVoiceSessionData | undefined = this.voiceSession.get(displayName)
        if (userSessionData) {
            this.userCount--
            userSessionData.leaveTimestamp = Date.now()
            this.voiceSession.set(displayName, userSessionData)
        }
    }

    private disconnectBotFromVoice(channel: VoiceBasedChannel): void {
        const connection = getVoiceConnection(channel.guild.id)
        if (connection) {
            connection.destroy()
        }
    }

    private sendVoiceSessionDataToS3(): void {
        if (!this.devMode) {
            const voiceSessionBatch: UserVoiceSessionData[] = []
            for (const userData of this.voiceSession.values()) {
                voiceSessionBatch.push(userData)
            }
            const payload: string = JSON.stringify(voiceSessionBatch)
            const s3Client: S3Client = new S3Client(process.env.VOICE_DATA_BUCKET ?? '')
            s3Client.putTextObject(payload)
            Logger.log(`Sent Voice Session to S3: ${payload}`, true)
        }
        this.voiceSession = new Map()
    }
}