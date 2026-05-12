export interface WebhookPayload {
  event: string;
  address: string;
  relatedFlagged: string;
  txHash: string;
  amount: number;
  timestamp: string;
  chain: string;
}
