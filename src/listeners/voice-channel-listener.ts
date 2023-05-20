import { Client, GuildMember, VoiceBasedChannel, VoiceState } from 'discord.js'
import { UserVoiceSessionData } from '../api/user-voice-session-data'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'
import { getVoiceConnection, joinVoiceChannel } from '@discordjs/voice'
import { loadJsonMap } from '../util/load-json'
import { EndBehaviorType } from '@discordjs/voice'
import * as fs from 'fs'
import * as prism from 'prism-media'

export class VoiceChannelListener implements Listener {

    private devMode: boolean = false

    private userCount: number = 0

    private voiceSession: Map<string, UserVoiceSessionData> = new Map()

    private recordableUsers: Map<string, string> = new Map()

    public attachClient(client: Client, appState: AppState): void {
        this.devMode = appState.devMode
        this.recordableUsers = loadJsonMap('./users.json')
        client.on('voiceStateUpdate', async (oldState, newState) => {
            this.handleVoiceStateChange(oldState, newState)
        })
    }

    private handleVoiceStateChange(oldState: VoiceState, newState: VoiceState): void {
        // user joins voice chat
        if (!oldState.channelId) {
            if (newState.member) {
                this.userJoinVoice(newState)
            }
        }
        // user leaves voice chat
        if (!newState.channelId) {
            if (oldState.member) {
                this.userLeaveVoice(oldState)
            }
        }
        // user changes voice chat channels, but stays connected to voice as a whole
        if (oldState.channelId && newState.channelId !== oldState.channelId) {
            // TODO: figure out if I want to utilize this functionality
        }
    }

    private userJoinVoice(voiceState: VoiceState): void {
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
        if (this.userCount === 1) { // TODO: i can add a check for if recording mode is enabled (appSettings property) or disabled here possibly
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
            if (this.recordableUsers.has(userId)) {
                const fileName: string = `./recordings/recording-${userId}-${Date.now()}.pcm`
                const audioStream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1000
                    }
                })
                const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 })
                const stream = audioStream.pipe(decoder).pipe(fs.createWriteStream(fileName))
                stream.on('finish', () => {
                    this.uploadVoiceRecordingToS3(fileName)
                    fs.unlink(fileName, err => {
                        if (err) {
                            Logger.error(`Failed to delete voice recording: ${err}`, !this.devMode)
                        }
                    })
                })
            }
        })
    }

    private uploadVoiceRecordingToS3(fileName: string): void {
        try {
            const fileData = fs.readFileSync(fileName)
            const s3Client: S3Client = new S3Client(process.env.VOICE_DATA_BUCKET ?? '')
            s3Client.putFile(fileData, fileName.substring(2))
            Logger.log(`Successfully uploaded voice recording to S3: ${fileName}`, false)
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
            Logger.log(`Sent batch to Lambda function: ${payload}`, true)
        }
        this.voiceSession = new Map()
    }
}