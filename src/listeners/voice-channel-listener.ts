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
        if (appState.shouldListen) {
            client.on('voiceStateUpdate', async (oldState, newState) => {
                // user joined voice chat
                if (!oldState.channelId) {
                    this.userCount++
                    const user = newState.member
                    const userDisplayName = user? user.displayName : ''
                    if (user && !this.voiceSession.has(userDisplayName)) {
                        const userVoiceSessionData: UserVoiceSessionData = {
                            joinedTimestamp: Date.now(),
                            leaveTimestamp: -1,
                            userId: user.id,
                            userDisplayName: user.displayName
                        }
                        this.voiceSession.set(userDisplayName, userVoiceSessionData)
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
                        }
                    }

                    /**
                     * 
                     * TODO:
                     *    - does this code even work?
                     *    - need to make the voice chat data bucket in S3 and figure out any IAM permissions
                     *    - need to figure out how to SCP or whatever protocol into the EC2 instance to upload ./dist
                     * 
                     */

                    if (this.userCount === 0) {
                        // send voice session data to S3
                        const voiceSessionBatch: UserVoiceSessionData[] = []
                        for (const userData of this.voiceSession.values()) {
                            voiceSessionBatch.push(userData)
                        }
                        const payload: string = JSON.stringify(voiceSessionBatch)
                        const s3Client: S3Client = new S3Client(process.env.VOICE_DATA_BUCKET ?? '')
                        s3Client.putObject(payload)
                        Logger.log(`Sent batch to Lambda function: ${payload}`)

                        // clear once the voice session ends. we  don't need the session to linger in memory
                        this.voiceSession = new Map()
                    }
                }

                if (oldState.channelId && newState.channelId !== oldState.channelId) {
                    // user moved voice channels -- figure out if i want to utilize this
                }
            })
        }
    }
}