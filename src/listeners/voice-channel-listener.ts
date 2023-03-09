import { Client } from "discord.js";
import { UserVoiceSessionData } from "../api/user-voice-session-data";
import { AppState } from "../app";
import { S3Client } from "../clients/s3-client";
import { Logger } from "../util/logger";
import { Listener } from "./listener";

export class VoiceChannelListener implements Listener {

    private userCount: number = 0
    private voiceSession: Map<string, UserVoiceSessionData> = new Map()

    public attachClient(client: Client, appState: AppState): void {
        client.on('voiceStateUpdate', async (oldState, newState) => {
            // user joined voice chat
            if (!oldState.channelId) {
                this.userCount++
                const user = newState.member
                if (user) {
                    const displayName: string = user.displayName
                    if (!this.voiceSession.has(displayName)) {
                        const userVoiceSessionData: UserVoiceSessionData = {
                            joinedTimestamp: Date.now(),
                            leaveTimestamp: -1,
                            userId: user.id,
                            userDisplayName: displayName
                        }
                        this.voiceSession.set(displayName, userVoiceSessionData)
                    }
                }
            }

            // user leaves voice chat
            if (!newState.channelId) {
                this.userCount--
                const user = oldState.member
                if (user) {
                    const displayName: string = user.displayName
                    const userVoiceSessionData: UserVoiceSessionData | undefined = this.voiceSession.get(displayName)
                    if (userVoiceSessionData) {
                        userVoiceSessionData.leaveTimestamp = Date.now()
                        this.voiceSession.set(displayName, userVoiceSessionData)
                    }
                }

                if (this.userCount === 0) {
                    const voiceSessionBatch: UserVoiceSessionData[] = []
                    for (const userData of this.voiceSession.values()) {
                        voiceSessionBatch.push(userData)
                    }
                    const payload: string = JSON.stringify(voiceSessionBatch)
                    const s3Client: S3Client = new S3Client(process.env.VOICE_DATA_BUCKET ?? '')
                    s3Client.putObject(payload)
                    Logger.log(`Sent batch to Lambda function: ${payload}`)
                    this.voiceSession = new Map()
                }
            }

            // user changes voice channels, but stays connected to voice as a whole
            if (oldState.channelId && newState.channelId !== oldState.channelId) {
                // this could lead to some interesting data, but I want to get basic functionality
                // working first
            }
        })
    }
}