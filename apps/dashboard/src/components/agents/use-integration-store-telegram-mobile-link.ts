import type { IEnvironment } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { type IntegrationStoreTelegramMobileLink, requestIntegrationStoreTelegramMobileLink } from '@/api/integrations';
import { requireEnvironment } from '@/context/environment/hooks';

/** A new setup link is fetched every 5 minutes, before the current one expires. */
export const LINK_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * A mobile setup link for the integration store, renewed every 5 minutes. Finishing setup on the phone creates the
 * Telegram integration in `environment`.
 */
export function useIntegrationStoreTelegramMobileLink({
  environment,
  enabled = true,
}: {
  environment?: IEnvironment;
  enabled?: boolean;
}) {
  return useQuery<IntegrationStoreTelegramMobileLink>({
    queryKey: ['telegramMobileLink', 'integration-store', environment?._id],
    queryFn: () =>
      requestIntegrationStoreTelegramMobileLink(requireEnvironment(environment, 'No environment selected')),
    enabled: enabled && Boolean(environment?._id),
    refetchInterval: LINK_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: LINK_REFRESH_INTERVAL_MS,
    meta: { showError: false },
  });
}
