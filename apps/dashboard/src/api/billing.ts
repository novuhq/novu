import type { GetSubscriptionDto } from '@novu/shared';
import { get } from './api.client';

export async function getBillingSubscription() {
  const { data } = await get<{ data: GetSubscriptionDto }>('/billing/subscription');

  return data;
}
