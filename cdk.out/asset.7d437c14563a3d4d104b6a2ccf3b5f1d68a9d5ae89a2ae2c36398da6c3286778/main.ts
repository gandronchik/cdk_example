import { APIGatewayEvent } from 'aws-lambda'
import * as AWS from 'aws-sdk'
import Order from 'models/Order'

const crypto = require("crypto")
const sqs = new AWS.SQS()

exports.handler = async (event: APIGatewayEvent) => {
    const order: Order = {
        id: crypto.randomBytes(16).toString("hex"),
        createdAt: (new Date()).toISOString(),
    };

    const params = {
        QueueUrl: process.env.QUEUE_URL as string,
        MessageBody: JSON.stringify(order),
    };
    console.log(params);
    await sqs.sendMessage(params).promise();
{{}}
    return {
        statusCode: 200,
        body: `Successfully pushed order ${JSON.stringify(order)}`
    }
}