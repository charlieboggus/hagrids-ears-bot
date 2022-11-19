import * as AWS from 'aws-sdk'
import { Logger } from '../util/logger'

export class S3Client {
    public async invoke(payload: string): Promise<void> {
        const bucketName: string = process.env.BUCKET_NAME ?? ''
        const params = {
            Bucket: bucketName,
            Key: this.generateKey(),
            Body: payload
        }
        const client = new AWS.S3({ region: process.env.AWS_REGION ?? 'us-east-1' })
        client.putObject(params, (err, data) => {
            if (err) {
                Logger.error(`Failed to store data in S3 bucket: ${JSON.stringify(err)}`)
            }
            else {
                Logger.log(`Successfully stored data in S3 bucket: ${JSON.stringify(data)}`)
            }
        })
    }

    private generateKey(): string {
        return `hagrid-hole-data-${Date.now()}`
    }
}