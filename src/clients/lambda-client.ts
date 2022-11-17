import * as AWS from 'aws-sdk'
import { Logger } from '../util/logger'
export class LambdaClient {
    constructor() {}

    public async invoke(payload: string): Promise<void> {
        const functionName: string = process.env.FUNCTION_NAME ?? ''
        let params = {
            FunctionName: functionName,
            InvocationType: 'RequestResponse',
            LogType: 'Tail',
            Payload: payload
        }
        const lambda = new AWS.Lambda({ region: 'us-east-1' })
        lambda.invoke(params, (err, data) => {
            if (err) {
                Logger.error(`Failed to call Lambda function: ${JSON.stringify(err)}`)
            }
            else {
                Logger.log(`Successfully called Lambda function: ${JSON.stringify(data.Payload)}`)
            }
        })
    }
}