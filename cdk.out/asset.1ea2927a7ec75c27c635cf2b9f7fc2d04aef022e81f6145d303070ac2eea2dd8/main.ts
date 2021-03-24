import { SQSEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import Order from 'models/Order';

const docClient = new AWS.DynamoDB.DocumentClient()

exports.handler = async (event: SQSEvent) => {
    for (const record of event.Records) {
        const order: Order = JSON.parse(record.body);

        const params = {
            TableName: process.env.TABLE_NAME as string,
            Item: order,
        }

        try {
            await docClient.put(params).promise()
        } catch (err) {
            console.log('DynamoDB error: ', err)
        }
    }
}