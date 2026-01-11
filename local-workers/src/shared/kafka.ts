import { Kafka, logLevel } from 'kafkajs';

export function createKafkaClient() {
  const broker = process.env.KAFKA_BROKER;
  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;
  const clientId = process.env.KAFKA_CLIENT_ID || 'ecommerce-platform';
console.log("BROKER:", process.env.KAFKA_BROKER);
console.log("USER:", process.env.KAFKA_USERNAME?.slice(0, 6));

  if (!broker || !username || !password) {
    throw new Error('Kafka env missing: KAFKA_BROKER, KAFKA_USERNAME, KAFKA_PASSWORD are required');
  }

  return new Kafka({
  clientId,
  brokers: [broker],
  ssl: true,
  sasl: { mechanism: 'plain', username, password },
  connectionTimeout: 30000,
  authenticationTimeout: 30000,
  requestTimeout: 30000
  });
}
