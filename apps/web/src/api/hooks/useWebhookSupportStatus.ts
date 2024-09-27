import { useQuery } from '@tanstack/react-query';
import { ChannelTypeEnum } from '@novu/shared';

import { getWebhookSupportStatus } from '../integration';
import { IS_SELF_HOSTED, WEBHOOK_URL } from '../../config';
import { useEnvironment } from '../../hooks';
import { useAuth } from '../../hooks/useAuth';

export const useWebhookSupportStatus = ({
  hasCredentials,
  integrationId,
  channel,
}: {
  hasCredentials?: boolean;
  integrationId?: string;
  channel?: ChannelTypeEnum;
}) => {
  const { environment } = useEnvironment();
  const { currentOrganization } = useAuth();

  const { data: webhookSupportStatus, ...rest } = useQuery(
    ['webhookSupportStatus', integrationId],
    () => getWebhookSupportStatus(integrationId as string),
    {
      enabled: Boolean(
        integrationId && channel && hasCredentials && [ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(channel)
      ),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  const isWebhookEnabled = !!(
    !IS_SELF_HOSTED &&
    webhookSupportStatus &&
    channel &&
    [ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(channel)
  );

  const webhookUrl =
    `${WEBHOOK_URL}/webhooks/organizations/${currentOrganization?._id}` +
    `/environments/${environment?._id}/${channel}/${integrationId}`;

  return {
    webhookSupportStatus,
    isWebhookEnabled,
    webhookUrl,
    ...rest,
  };
};
