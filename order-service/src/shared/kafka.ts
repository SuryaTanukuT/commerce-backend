import { Kafka, logLevel } from 'kafkajs';


export function createKafkaClient() {
  const broker = process.env.KAFKA_BROKER;
  const username = process.env.KAFKA_USERNAME;
  const password = process.env.KAFKA_PASSWORD;
  const clientId = process.env.KAFKA_CLIENT_ID || 'ecommerce-platform';

  if (!broker || !username || !password) {
    throw new Error('Kafka env missing: KAFKA_BROKER, KAFKA_USERNAME, KAFKA_PASSWORD are required');
  }
console.log("KAFKA_BROKER:", process.env.KAFKA_BROKER);
console.log("KAFKA_USERNAME:", process.env.KAFKA_USERNAME?.slice(0, 6));

  return new Kafka({
    clientId,
    brokers: [broker],
    ssl: true,
    sasl: { mechanism: 'plain', username, password },
     // ✅ Increase & stabilize
    connectionTimeout: 30000,
    authenticationTimeout: 30000,
    requestTimeout: 30000,

    // ✅ Show real reason (auth, sasl, etc.)
    logLevel: logLevel.INFO,
  });
}
