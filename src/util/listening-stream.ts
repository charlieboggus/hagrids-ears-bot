import { EndBehaviorType, VoiceReceiver } from '@discordjs/voice'
import { pipeline } from 'stream'
import { Logger } from '../util/logger'
import * as fs from 'fs'
import * as prism from 'prism-media'

export const createListeningStream = (receiver: VoiceReceiver, userId: string, username: string) => {
    const filename: string = `./recordings/recording-${userId}-${username}.ogg`
    const opusStream = receiver.subscribe(userId, { end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 } })
    const oggStream = new prism.opus.OggLogicalBitstream({
        opusHead: new prism.opus.OpusHead({ channelCount: 2, sampleRate: 48000 }),
        pageSizeControl: { maxPackets: 10 }
    })
    const outStream = fs.createWriteStream(filename)
    pipeline(opusStream, oggStream, outStream, (err) => {
        if (err) {
            Logger.error(`Failed to write voice recording: ${filename}`, false)
        }
    })
}