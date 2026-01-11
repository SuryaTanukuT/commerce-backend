import AWS from 'aws-sdk';
import { EventType, type BaseEvent, type PaymentCompletedPayload } from '../order-service/src/shared/events';

export async function handler(evt: BaseEvent<EventType, any>) {
  if (evt.type !== EventType.PaymentCompleted) return;
  const payload = evt.payload as PaymentCompletedPayload;

  const from = process.env.SES_FROM_EMAIL;
  const to = process.env.NOTIFY_TO_EMAIL;

  if (!from || !to) {
    console.log(`[notification-lambda] (no SES configured) Order ${payload.orderId} paid. paymentId=${payload.paymentId}`);
    return;
  }

  const ses = new AWS.SES({ region: process.env.AWS_REGION });

  await ses
    .sendEmail({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: `Order Paid: ${payload.orderId}` },
        Body: {
          Text: { Data: `Payment successful. Order=${payload.orderId}, PaymentId=${payload.paymentId}` },
        },
      },
    })
    .promise();

  console.log(`[notification-lambda] Email sent for order=${payload.orderId}`);
}
