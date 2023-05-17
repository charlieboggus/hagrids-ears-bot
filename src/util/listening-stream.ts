import { createWriteStream } from "fs"
import { pipeline } from "stream"
import { EndBehaviorType, VoiceReceiver } from "@discordjs/voice"
import * as prism from 'prism-media'

export class ListeningStream {
    public static create(receiver: VoiceReceiver, userId: string, username: string) {
        const opusStream = receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 } })
        const oggStream = new prism.opus.OggLogicalBitstream({
            opusHead: new prism.opus.OpusHead({ channelCount: 2, sampleRate: 48000 }),
            pageSizeControl: { maxPackets: 10 }
        })

        // TODO: might be better to just keep the data in memory & ship it off to S3 without writing
        // to the instance's storage & then deleting the file after it's shipped off to S3
        // will figure out once i'm ready to implement voice chat listening
        const filename: string = `recording-${userId}-${username}.ogg`
        const out = createWriteStream(filename)
        pipeline(opusStream, oggStream, out, (err) => {
            if (err) {
                // TODO: error handling
            }
        })
    } 
}