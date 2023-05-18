import { Client, GuildMember, VoiceState } from 'discord.js'
import { UserVoiceSessionData } from '../api/user-voice-session-data'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'
import { createVoiceConnection } from '../util/voice-connection'
import { getVoiceConnection } from '@discordjs/voice'
import { loadJsonMap } from '../util/load-json'
import { createListeningStream } from '../util/listening-stream'

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
        const channel = voiceState.channel
        if (channel) {
            const connection = createVoiceConnection(channel)
            const receiver = connection.receiver
            receiver.speaking.on('start', (userId) => {
                if (this.recordableUsers.has(userId)) {
                    // this shit crashes out whenever someone speaks... need to figure out why
                    //createListeningStream(receiver, userId, displayName)
                }
            })
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

    private userLeaveVoice(voiceState: VoiceState): void {
        if (!voiceState.member) {
            return
        }
        const user: GuildMember = voiceState.member
        const displayName: string = user.displayName
        this.removeUserFromVoiceSession(displayName)
        if (this.userCount === 0) {
            this.sendVoiceSessionDataToS3()
            const channel = voiceState.channel
            if (channel) {
                const connection = getVoiceConnection(channel.guild.id)
                connection?.destroy()
            }
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

    private sendVoiceSessionDataToS3(): void {
        if (!this.devMode) {
            const voiceSessionBatch: UserVoiceSessionData[] = []
            for (const userData of this.voiceSession.values()) {
                voiceSessionBatch.push(userData)
            }
            const payload: string = JSON.stringify(voiceSessionBatch)
            const s3Client: S3Client = new S3Client(process.env.VOICE_DATA_BUCKET ?? '')
            s3Client.putObject(payload)
            Logger.log(`Sent batch to Lambda function: ${payload}`, true)
        }
        this.voiceSession = new Map()
    }
}