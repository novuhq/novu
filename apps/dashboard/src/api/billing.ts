import type { GetSubscriptionDto, IEnvironment, IOrganizationUsageLimits } from '@novu/shared';
import { del, get, put } from './api.client';

export async function getSubscription({ environment }: { environment: IEnvironment }) {
  const { data } = await get<{ data: GetSubscriptionDto }>('/billing/subscription', { environment });
  return data;
}

export async function updateUsageLimits({
  environment,
  usageLimits,
}: {
  environment: IEnvironment;
  usageLimits: IOrganizationUsageLimits;
}) {
  const { data } = await put<{ data: IOrganizationUsageLimits }>('/billing/usage-limits', {
    environment,
    body: usageLimits,
  });

  return data;
}

export async function resetUsageLimits({ environment }: { environment: IEnvironment }) {
  const { data } = await del<{ data: IOrganizationUsageLimits }>('/billing/usage-limits', { environment });

  return data;
}
