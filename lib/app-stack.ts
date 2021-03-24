import * as CDK from '@aws-cdk/core';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda';
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';
import { RestApi, LambdaIntegration } from '@aws-cdk/aws-apigateway';
import { Table, AttributeType } from '@aws-cdk/aws-dynamodb';
import { Queue } from '@aws-cdk/aws-sqs';
import { Effect, Policy, PolicyStatement } from '@aws-cdk/aws-iam';

export class AppStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const queue = new Queue(this, 'ordersQueue', {
      queueName: 'ordersQueue'
    })

    const table = new Table(this, 'completedOrders', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    })

    const notifyFunction = new Function(this, 'notifyFunction', {
      runtime: Runtime.NODEJS_12_X,
      handler: 'main.handler',
      code: Code.fromAsset('./handlers/notify'),
      environment: {
        QUEUE_URL: queue.queueUrl
      },
    })

    const api = new RestApi(this, 'api', {
      deployOptions: {
        stageName: 'dev'
      },
    })

    api.root.addMethod('GET', new LambdaIntegration(notifyFunction));

    const subscribeFunction = new Function(this, 'subscribeFunction', {
      runtime: Runtime.NODEJS_12_X,
      handler: 'main.handler',
      code: Code.fromAsset('./handlers/subscribe'),
      environment: {
        QUEUE_URL: queue.queueUrl,
        TABLE_NAME: table.tableName
      },
      events: [
        new SqsEventSource(queue)
      ],
    })

    notifyFunction.role!.attachInlinePolicy(new Policy(this, 'lambdaPublishToSqsPolicy', {
      statements: [
        new PolicyStatement({
          sid: 'lambdaPublishToSqsPolicy',
          actions: ['sqs:SendMessage'],
          resources: [queue.queueArn],
          effect: Effect.ALLOW
        }),
      ]
    }))

    subscribeFunction.role!.attachInlinePolicy(new Policy(this, 'lambdaWriteToDynamoDbPolicy', {
      statements: [
        new PolicyStatement({
          sid: 'lambdaWriteToDynamoDbPolicy',
          actions: ['dynamodb:PutItem'],
          resources: [table.tableArn],
          effect: Effect.ALLOW
        }),
      ]
    }))

    new CDK.CfnOutput(this, 'ApiURL', {
      value: api.url,
    })

    new CDK.CfnOutput(this, 'ProjectRegion', {
      value: this.region,
    })
  }
}
