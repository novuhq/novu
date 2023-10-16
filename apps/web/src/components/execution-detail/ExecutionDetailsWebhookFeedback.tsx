import { Group } from '@mantine/core';
import styled from '@emotion/styled';
import { format, parseISO } from 'date-fns';

import { colors, Container, Text, Tooltip } from '@novu/design-system';
import { mappedWebhookStatuses } from './helpers';

const WebhookFeedbackWrapper = styled(Container)`
  align-items: center;
  display: flex;
  flex-flow: column;
  justify-content: center;
  margin: 0;
  padding: 15px 10px;
`;

const WebhookFeedbackTitle = styled(Text)`
  color: ${colors.B60};
  font-size: 12px;
  line-height: 16px;
  padding-top: 5px;
`;

const WebhookTimeStamp = ({ timeStamp }) => {
  const formattedDate = format(parseISO(timeStamp), 'hh:mm aaa, dd/MM/yyyy');

  return <span>{formattedDate}</span>;
};

const WebhookFeedback = ({ icon, text, timeStamp }) => {
  const Icon = icon;

  return (
    <Tooltip label={<WebhookTimeStamp timeStamp={timeStamp} />}>
      <WebhookFeedbackWrapper>
        <Icon height="15px" width="15px" />
        <WebhookFeedbackTitle>{text}</WebhookFeedbackTitle>
      </WebhookFeedbackWrapper>
    </Tooltip>
  );
};

export const ExecutionDetailsWebhookFeedback = ({ executionDetails }) => {
  const getWebhookIcons = () => {
    const icons: JSX.Element[] = [];

    executionDetails.forEach((detail) => {
      const webhookStatus = detail?.webhookStatus;

      if (webhookStatus) {
        Object.keys(mappedWebhookStatuses).forEach((key) => {
          const status = mappedWebhookStatuses[key].status;
          const icon = mappedWebhookStatuses[key].icon;
          const label = mappedWebhookStatuses[key].label;
          if (status.includes(webhookStatus.toLowerCase())) {
            icons.push(<WebhookFeedback icon={icon} text={label} timeStamp={detail?.updatedAt} />);
          }
        });
      }
    });

    return icons;
  };

  return (
    <Group position="right" spacing="xs">
      {getWebhookIcons()}
    </Group>
  );
};
