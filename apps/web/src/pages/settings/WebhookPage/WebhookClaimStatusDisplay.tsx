import { IconDomainVerification, IconOutlineDomainDisabled, IconOutlinePendingActions } from '@novu/design-system';
import { LocalizedMessage } from '@novu/shared-web';
import { FC } from 'react';
import { cva } from '../../../styled-system/css';
import { HStack } from '../../../styled-system/jsx';
import { Text } from './WebhookPage.shared';
import { type WebhookClaimStatus } from './WebhookPage.types';

const WEBHOOK_STATUS_LABEL_LOOKUP: Record<WebhookClaimStatus, LocalizedMessage> = {
  unclaimed: 'Not claimed',
  pending: 'Pending...',
  claimed: 'Claimed',
};

const WEBHOOK_STATUS_ICON_LOOKUP: Record<WebhookClaimStatus, React.ReactNode> = {
  unclaimed: <IconOutlineDomainDisabled />,
  pending: <IconOutlinePendingActions />,
  claimed: <IconDomainVerification />,
};

interface IWebhookClaimStatusProps {
  status: WebhookClaimStatus;
}

const iconTextRecipe = cva({
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

export const WebhookClaimStatusDisplay: FC<IWebhookClaimStatusProps> = ({ status }) => {
  return (
    <HStack gap="50">
      <Text>Status</Text>
      <HStack gap="25" className={iconTextRecipe({ status })}>
        {WEBHOOK_STATUS_ICON_LOOKUP[status]}
        <Text>{WEBHOOK_STATUS_LABEL_LOOKUP[status]}</Text>
      </HStack>
    </HStack>
  );
};
