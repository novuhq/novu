import {
  IconOutlineDomainVerification,
  IconOutlineHourglassTop,
  IconOutlineWebAssetOff,
  IconRefresh,
  When,
} from '@novu/design-system';
import { FC } from 'react';
import { cva } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';
import { SystemStyleObject } from '@novu/novui/types';
import { IconButton } from '../../../components';
import { LocalizedMessage } from '../../../types/LocalizedMessage';
import { Text } from './WebhookPage.shared';
import { type WebhookClaimStatus } from './WebhookPage.types';

const WEBHOOK_STATUS_LABEL_LOOKUP: Record<WebhookClaimStatus, LocalizedMessage> = {
  unclaimed: 'Not claimed',
  pending: 'Pending...',
  claimed: 'Claimed',
};

const WEBHOOK_STATUS_ICON_LOOKUP: Record<WebhookClaimStatus, React.ReactNode> = {
  unclaimed: <IconOutlineWebAssetOff />,
  pending: <IconOutlineHourglassTop />,
  claimed: <IconOutlineDomainVerification />,
};

interface IWebhookClaimStatusProps {
  status: WebhookClaimStatus;
  handleRefresh: () => Promise<any>;
  isLoading: boolean;
}

const iconTextRecipe = cva<{ status: Record<WebhookClaimStatus, SystemStyleObject> }>({
  base: {
    '& p, & svg': {
      color: 'typography.text.main !important',
    },
  },
  variants: {
    status: {
      claimed: {
        '& p, & svg': {
          color: 'typography.text.feedback.success !important',
        },
      },
      pending: {},
      unclaimed: {},
    },
  },
});

export const WebhookClaimStatusDisplay: FC<IWebhookClaimStatusProps> = ({ status, handleRefresh, isLoading }) => {
  return (
    <HStack gap="50">
      <Text>Status</Text>
      <HStack gap="25" className={iconTextRecipe({ status })}>
        {WEBHOOK_STATUS_ICON_LOOKUP[status]}
        <Text>{WEBHOOK_STATUS_LABEL_LOOKUP[status]}</Text>
      </HStack>
      <When truthy={status === 'pending'}>
        <IconButton id="refresh-status-button" onClick={handleRefresh} loading={isLoading} disabled={isLoading}>
          <IconRefresh />
        </IconButton>
      </When>
    </HStack>
  );
};
