import type { PaymentAdapter, PaymentResult, WebhookResult } from "./types";

class DummyPaymentAdapter implements PaymentAdapter {
  async createSubscription(_userId: string, plan: string): Promise<PaymentResult> {
    console.log(`[DummyPayment] createSubscription: ${plan}`);
    return {
      success: true,
      subscriptionId: `dummy_${crypto.randomUUID()}`,
      providerData: { plan },
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<PaymentResult> {
    console.log(`[DummyPayment] cancelSubscription: ${subscriptionId}`);
    return { success: true };
  }

  async handleWebhook(_request: Request): Promise<WebhookResult> {
    console.log("[DummyPayment] handleWebhook called");
    return { processed: true, event: "dummy" };
  }
}

let adapter: PaymentAdapter | null = null;

export function getPaymentAdapter(): PaymentAdapter {
  if (!adapter) {
    adapter = new DummyPaymentAdapter();
  }
  return adapter;
}

export { type PaymentAdapter, type PaymentResult, type WebhookResult } from "./types";
