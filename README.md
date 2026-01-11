# Event-Driven E-Commerce (Microservices + Kafka + MongoDB + GraphQL + "Lambda" workers)

This repo is a **backend-only** (Postman-first) reference implementation of a scalable, event-driven e-commerce platform:

- **Microservices**: user-service, product-service, order-service
- **API Gateway**: GraphQL (Apollo Server)
- **Messaging**: Kafka (Confluent Cloud) using `kafkajs`
- **Databases**: MongoDB Atlas (database-per-service)
- **Serverless**: payment + notification are written as **AWS Lambda handlers**
  - For local run, we provide **workers** that consume Kafka and invoke the Lambda handlers (so you can run end-to-end without AWS).

> ✅ No Docker required.

---

## 0) Prerequisites

- Node.js 18+
- MongoDB Atlas URIs (one per service)
- Confluent Cloud Kafka cluster + API Key/Secret + bootstrap server

---

## 1) Setup

1. Copy `.env.example` → `.env` (in repo root) and fill values.
2. Install dependencies in each service (or use the helper commands below).

### Install all (Windows PowerShell)

```powershell
cd ecommerce-platform
npm i --prefix api-gateway
npm i --prefix user-service
npm i --prefix product-service
npm i --prefix order-service
npm i --prefix local-workers
```

### Install all (macOS/Linux)

```bash
cd ecommerce-platform
npm i --prefix api-gateway
npm i --prefix user-service
npm i --prefix product-service
npm i --prefix order-service
npm i --prefix local-workers
```

---

## 2) Run (end-to-end locally)

Open **5 terminals**:

### Terminal A — User Service
```bash
cd user-service
npm run dev
```

### Terminal B — Product Service
```bash
cd product-service
npm run dev
```

### Terminal C — Order Service
```bash
cd order-service
npm run dev
```

### Terminal D — GraphQL Gateway
```bash
cd api-gateway
npm run dev
```

### Terminal E — Local Kafka Workers (simulate Lambdas)
```bash
cd local-workers
npm run dev
```

When everything is running you should see logs like:
- `User Service running on :3001`
- `Product Service running on :3002`
- `Order Service running on :3003`
- `GraphQL Gateway running on :4000`
- Workers: `payment-worker consuming order-events`, `notification-worker consuming payment-events`

---

## 3) Test with Postman

Import: `postman/ecommerce-platform.postman_collection.json`

### Typical flow
1. **Register** user → `POST /auth/register`
2. **Login** user → get JWT
3. **Create product** → `POST /products`
4. **Create order** (authorized) → `POST /orders`
5. Watch workers process:
   - OrderCreated → PaymentCompleted → Notification sent/logged

---

## 4) GraphQL usage

Gateway endpoint:
- `http://localhost:4000/graphql`

Example mutation:

```graphql
mutation CreateOrder($userId: String!, $amount: Float!) {
  createOrder(userId: $userId, amount: $amount) {
    id
    status
    userId
    amount
  }
}
```

Add header in Postman:
- `Authorization: Bearer <JWT>`

---

## 5) Notes on AWS Lambda / Serverless

We included:
- `payment-lambda/handler.ts` (Lambda handler)
- `notification-lambda/handler.ts` (Lambda handler)
- `serverless.yml` (deployable)

For **Confluent Cloud → Lambda triggers**, you typically need:
- a bridge/connector (or MSK if using AWS-native Kafka)
- or a small always-on consumer (Fargate/ECS) that invokes Lambda

For this repo, the **local-workers** package simulates this.

---

## 6) Event contracts

Events are JSON payloads with a `type` field:

- `ORDER_CREATED`
- `PAYMENT_COMPLETED`
- `PAYMENT_FAILED` (optional extension)

---

## 7) Security

- JWT is issued by `user-service`
- Services validate JWT using `JWT_SECRET`
- Order creation requires auth (simple middleware)

---

## 8) Observability

- Each request has `x-correlation-id` (generated if missing)
- Correlation id is attached to Kafka messages for tracing

---

Happy building. 🚀


## Option B: Use real AWS Lambda (without paid Confluent connectors)

In this mode, Kafka remains on Confluent Cloud, but `local-workers` invokes AWS Lambda functions remotely using the AWS SDK.

### 1) Deploy Lambdas (from repo root)

```bash
npm i -g serverless
npm i -D serverless-esbuild serverless-dotenv-plugin
serverless deploy
```

### 2) Copy function names into `.env`

After deploy, run `serverless info` and copy the deployed function names into:

```env
PAYMENT_LAMBDA_NAME=...
NOTIFICATION_LAMBDA_NAME=...
```

### 3) Start local-workers

```bash
cd local-workers
npm i
npm run dev
```
