import * as AWS from 'aws-sdk'
import { PublishInput } from 'aws-sdk/clients/sns'
import { Logger } from '../util/logger'

export class SNSClient {
    public async publish(message: string, subject?: string): Promise<void> {
        const params: PublishInput = {
            TopicArn: process.env.TOPIC_ARN ?? '',
            Message: message,
            Subject: subject
        }
        const client = new AWS.SNS({ region: process.env.AWS_REGION ?? 'us-east-1' })
        try {
            await client.publish(params, (err, data) => {
                if (err) {
                    Logger.error(`Failed to call SNS ${err}`)
                }
                else {
                    Logger.log(`Successfully called SNS topic ${data}`)
                }
            })
        }
        catch (err) {
            Logger.error(`Threw an error when calling SNS ${err}`)
        }
    }
}