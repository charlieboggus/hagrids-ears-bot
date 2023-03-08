import { Client } from "discord.js";
import { AppState } from "../app";
import { Listener } from "./listener";


export class VoiceChannelListener implements Listener {

    // the current number of users in voice chat -- when this reaches 0 the voice session resets
    private userCount: number = 0

    // tracks how much time each user spends in a voice chat session
    private voiceSessionMap: Map<string, number> = new Map()

    public attachClient(client: Client, appState: AppState): void {
        if (appState.shouldListen) {
            client.on('voiceStateUpdate', async (oldState, newState) => {
                if (!oldState.channelId) {
                    // user joined voice chat -- increment userCount, if userCount is 0, start a new session
                }

                if (!newState.channelId) {
                    // user left voice chat -- decrement userCount, if  userCount is 0 end session
                }

                if (oldState.channelId && newState.channelId !== oldState.channelId) {
                    // user moved voice channels -- figure out if i want to utilize this
                }
            })
        }
    }
}