import { loadRootEnv } from './shared/env';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createKafkaClient } from './shared/kafka';
import { EventType, type BaseEvent } from './shared/events';
loadRootEnv();
  const lambda = new LambdaClient({ region: process.env.AWS_REGION });


async function startPaymentWorker() {
  const kafka = createKafkaClient();
  const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'ecommerce-payment-worker' });

  await consumer.connect();
  await consumer.subscribe({ topic: process.env.KAFKA_ORDER_TOPIC!, fromBeginning: true });

  console.log('[payment-worker] consuming', process.env.KAFKA_ORDER_TOPIC);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const evt = JSON.parse(message.value.toString()) as BaseEvent<EventType, any>;
      if (evt.type !== EventType.OrderCreated) return;

      // Invoke payment lambda handler (like AWS would)
      const fn = process.env.PAYMENT_LAMBDA_NAME;
      if (!fn) throw new Error('PAYMENT_LAMBDA_NAME missing in .env');

      await lambda.send(new InvokeCommand({
        FunctionName: fn,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify(evt)),
      }));
},
  });
}

async function startNotificationWorker() {
  const kafka = createKafkaClient();
  const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'ecommerce-notification-worker' });

  await consumer.connect();
  await consumer.subscribe({ topic: process.env.KAFKA_PAYMENT_TOPIC!, fromBeginning: true });

  console.log('[notification-worker] consuming', process.env.KAFKA_PAYMENT_TOPIC);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const evt = JSON.parse(message.value.toString()) as BaseEvent<EventType, any>;
      if (evt.type !== EventType.PaymentCompleted) return;

      const fn = process.env.NOTIFICATION_LAMBDA_NAME;
      if (!fn) throw new Error('NOTIFICATION_LAMBDA_NAME missing in .env');

      await lambda.send(new InvokeCommand({
        FunctionName: fn,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify(evt)),
      }));
},
  });
}

async function main() {
  await Promise.all([startPaymentWorker(), startNotificationWorker()]);
}

main().catch((e) => {
  console.error('Local workers failed', e);
  process.exit(1);
});
