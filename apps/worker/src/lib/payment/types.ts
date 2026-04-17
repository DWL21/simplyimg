export interface PaymentResult {
  success: boolean;
  subscriptionId?: string;
  providerData?: Record<string, unknown>;
  error?: string;
}

export interface WebhookResult {
  processed: boolean;
  event?: string;
}

export interface PaymentAdapter {
  createSubscription(userId: string, plan: string): Promise<PaymentResult>;
  cancelSubscription(subscriptionId: string): Promise<PaymentResult>;
  handleWebhook(request: Request): Promise<WebhookResult>;
}
