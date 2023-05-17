import * as AWS from 'aws-sdk'
import { Logger } from '../util/logger'

export class S3Client {

    constructor (private readonly bucketName: string) {}

    public async putObject(payload: string): Promise<void> {
        const params = {
            Bucket: this.bucketName,
            Key: `hagrid-hole-data-v3-${Date.now()}`,
            Body: payload
        }
        const client = new AWS.S3({ region: process.env.AWS_REGION ?? 'us-east-1' })
        client.putObject(params, (err) => {
            if (err) {
                Logger.error(`Failed to store data in S3 bucket: ${JSON.stringify(err)}`)
            }
        })
    }
}