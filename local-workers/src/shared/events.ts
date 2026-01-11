
export enum EventType {
  OrderCreated = 'ORDER_CREATED',
  PaymentCompleted = 'PAYMENT_COMPLETED',
  PaymentFailed = 'PAYMENT_FAILED',
}

export type BaseEvent<TType extends EventType, TPayload> = {
  type: TType;
  correlationId: string;
  payload: TPayload;
  occurredAt: string; // ISO time
};

export type OrderCreatedPayload = {
  orderId: string;
  userId: string;
  amount: number;
};

export type PaymentCompletedPayload = {
  orderId: string;
  paymentId: string;
  status: 'SUCCESS';
};

export type PaymentFailedPayload = {
  orderId: string;
  paymentId: string;
  status: 'FAILED';
  reason: string;
};
