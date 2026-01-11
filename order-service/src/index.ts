import express from 'express';
import mongoose from 'mongoose';
import { createKafkaClient } from './shared/kafka';
import { EventType, type BaseEvent, type OrderCreatedPayload, type PaymentCompletedPayload } from './shared/events';
import { loadRootEnv } from './shared/env';
import { requireAuth } from './shared/jwt';
import { correlationId } from './shared/correlation';

loadRootEnv();



const OrderSchema = new mongoose.Schema(
  { userId: String, amount: Number, status: String },
  { timestamps: true }
);

const Order = mongoose.model('Order', OrderSchema);


async function startPaymentEventConsumer() {
  const kafka = createKafkaClient();
  const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'ecommerce-order-service' });

  await consumer.connect();
  await consumer.subscribe({ topic: process.env.KAFKA_PAYMENT_TOPIC!, fromBeginning: true });

  console.log('[order-service] consumer listening on', process.env.KAFKA_PAYMENT_TOPIC);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const evt = JSON.parse(message.value.toString()) as BaseEvent<EventType, any>;

      if (evt.type === EventType.PaymentCompleted) {
        const payload = evt.payload as PaymentCompletedPayload;

        // Idempotency: setting status to PAID is safe to retry.
        await Order.updateOne({ _id: payload.orderId }, { $set: { status: 'PAID' } });

        console.log(`[order-service] Order ${payload.orderId} updated -> PAID (cid=${evt.correlationId})`);
      }
    },
  });
}

async function main() {
  // Mongo connect (required)
  await mongoose.connect(process.env.MONGO_ORDER_URI!);
  console.log('[order-service] Mongo connected');

  // Kafka producer (optional for dev; do not crash app if Kafka is down)
  let producer: any = null;
  let kafkaReady = false;

  try {
    const kafka = createKafkaClient();
    producer = kafka.producer();
    await producer.connect();
    kafkaReady = true;
    console.log('[order-service] Kafka producer connected');
  } catch (e) {
    console.error('[order-service] Kafka producer NOT connected. Continuing without Kafka.', e);
  }

  //Express app
  const app = express();
  app.use(express.json());
  app.use(correlationId);

  // Health includes kafka readiness
  app.get('/health', (_req, res) => res.json({ ok: true, kafkaReady }));

  /**
   * Create Order (protected)
   * Header: Authorization: Bearer <token>
   */
app.post('/orders', requireAuth, async (req: any, res) => {
  const { amount } = req.body ?? {};
  if (amount == null) return res.status(400).json({ message: 'amount required' });

  const userId = req.user.id; // ✅ from JWT

  const order = await Order.create({ userId, amount, status: 'CREATED' });

  // publish OrderCreated event...
  return res.json({ id: order.id, userId, amount, status: order.get('status') });
});



  /**
   * List orders (protected)
   */
  app.get('/orders', requireAuth, async (_req, res) => {
    const items = await Order.find().lean();
    res.json(items.map((o: any) => ({ id: o._id.toString(), userId: o.userId, amount: o.amount, status: o.status })));
  });

  const port = Number(process.env.ORDER_PORT || 3003);
  app.listen(port, () => console.log(`Order Service running on :${port}`));

  //Start consumer for payment events (optional; don't crash app if it fails)
  if (kafkaReady) {
    startPaymentEventConsumer()
      .then(() => console.log('[order-service] Kafka consumer started'))
      .catch((e) => console.error('[order-service] Kafka consumer failed, continuing.', e));
  } else {
    console.warn('[order-service] Kafka not ready; payment consumer not started');
  }
}

main().catch((e) => {
  console.error('Order service failed', e);
  process.exit(1);
});
