import { Client, GuildMember, VoiceState } from 'discord.js'
import { UserVoiceSessionData } from '../api/user-voice-session-data'
import { AppState } from '../app'
import { S3Client } from '../clients/s3-client'
import { Logger } from '../util/logger'
import { Listener } from './listener'

export class VoiceChannelListener implements Listener {

    private userCount: number = 0

    private voiceSession: Map<string, UserVoiceSessionData> = new Map()

    public attachClient(client: Client, _appState: AppState): void {
        client.on('voiceStateUpdate', async (oldState, newState) => {
            this.handleVoiceStateChange(oldState, newState)
        })
    }

    private handleVoiceStateChange(oldState: VoiceState, newState: VoiceState): void {
        // user joins voice chat
        if (!oldState.channelId) {
            if (newState.member) {
                this.userJoinVoice(newState.member)
            }
        }

        // user leaves voice chat
        if (!newState.channelId) {
            if (oldState.member) {
                this.userLeaveVoice(oldState.member)
            }
        }

        // user changes voice chat channels, but stays connected to voice as a whole
        if (oldState.channelId && newState.channelId !== oldState.channelId) {
            // TODO: figure out if I want to utilize this functionality
        }
    }

    private userJoinVoice(user: GuildMember): void {
        this.userCount++
        const displayName: string = user.displayName
        if (!this.voiceSession.has(displayName)) {
            const userSessionData: UserVoiceSessionData = {
                joinedTimestamp: Date.now(),
                leaveTimestamp: -1,
                userId: user.id,
                userDisplayName: displayName
            }
            this.voiceSession.set(displayName, userSessionData)
        }
    }

    private userLeaveVoice(user: GuildMember): void {
        this.userCount--
        const displayName: string = user.displayName
        const userSessionData: UserVoiceSessionData | undefined = this.voiceSession.get(displayName)
        if (userSessionData) {
            userSessionData.leaveTimestamp = Date.now()
            this.voiceSession.set(displayName, userSessionData)
        }

        if (this.userCount === 0) {
            this.sendVoiceSessionDataToS3()
        }
    }

    private sendVoiceSessionDataToS3(): void {
        const voiceSessionBatch: UserVoiceSessionData[] = []
        for (const userData of this.voiceSession.values()) {
            voiceSessionBatch.push(userData)
        }
        const payload: string = JSON.stringify(voiceSessionBatch)
        const s3Client: S3Client = new S3Client(process.env.VOICE_DATA_BUCKET ?? '')
        s3Client.putObject(payload)
        Logger.log(`Sent batch to Lambda function: ${payload}`, true)
        this.voiceSession = new Map()
    }
}