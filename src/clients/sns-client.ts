import * as AWS from 'aws-sdk'
import { PublishInput } from 'aws-sdk/clients/sns'
import { Logger } from '../util/logger'

export class SNSClient {
    public publishNotification(message: string, subject?: string): void {
        const params: PublishInput = {
            TopicArn: process.env.TOPIC_ARN ?? '',
            Message: message,
            Subject: subject
        }
        const client = new AWS.SNS({ region: process.env.AWS_REGION ?? 'us-east-1' })
        try {
            client.publish(params, (err) => {
                if (err) {
                    Logger.error(`Failed to call SNS ${err}`)
                }
            })
        }
        catch (err) {
            Logger.error(`Threw an error when calling SNS ${err}`)
        }
    }
}