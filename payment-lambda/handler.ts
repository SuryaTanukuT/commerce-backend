import { EventType, type BaseEvent, type OrderCreatedPayload, type PaymentCompletedPayload } from '../order-service/src/shared/events';
import { createKafkaClient } from '../order-service/src/shared/kafka';


export async function handler(evt: BaseEvent<EventType, any>) {
  if (evt.type !== EventType.OrderCreated) return;

  const payload = evt.payload as OrderCreatedPayload;
  const paymentId = `pay_${payload.orderId}_${Date.now()}`;

  // Simulate payment success (you can add a random failure if you want)
  const out: BaseEvent<EventType.PaymentCompleted, PaymentCompletedPayload> = {
    type: EventType.PaymentCompleted,
    correlationId: evt.correlationId,
    occurredAt: new Date().toISOString(),
    payload: { orderId: payload.orderId, paymentId, status: 'SUCCESS' },
  };

  const kafka = createKafkaClient();
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({
    topic: process.env.KAFKA_PAYMENT_TOPIC!,
    messages: [{ key: payload.orderId, value: JSON.stringify(out) }],
  });
  await producer.disconnect();

  console.log(`[payment-lambda] Payment SUCCESS for order=${payload.orderId} (cid=${evt.correlationId})`);
}
