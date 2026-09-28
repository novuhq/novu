import type { GetSubscriptionDto, IEnvironment, UpdateUsageLimitsDto, UsageLimitsSettingsDto } from '@novu/shared';
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
  usageLimits: UpdateUsageLimitsDto;
}) {
  const { data } = await put<{ data: UsageLimitsSettingsDto }>('/billing/usage-limits', {
    environment,
    body: usageLimits,
  });

  return data;
}

export async function resetUsageLimits({ environment }: { environment: IEnvironment }) {
  const { data } = await del<{ data: UsageLimitsSettingsDto }>('/billing/usage-limits', { environment });

  return data;
}
