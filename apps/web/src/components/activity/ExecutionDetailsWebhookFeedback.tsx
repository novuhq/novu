import { Group } from '@mantine/core';
import styled from 'styled-components';

import { colors, Container, Text } from '../../design-system';
import { Clicked, Read, Received, Seen, Sent } from '../../design-system/icons';

const WebhookFeedbackWrapper = styled(Container)`
  align-items: center;
  display: flex;
  flex-flow: column;
  justify-content: center;
  margin: 0;
  padding: 15px 0 0;
`;

const WebhookFeedbackTitle = styled(Text)`
  color: ${colors.B60};
  font-size: 12px;
  line-height: 16px;
  padding-top: 5px;
`;

const WebhookFeedback = ({ icon, text }) => {
  const Icon = icon;

  return (
    <WebhookFeedbackWrapper>
      <Icon height="15px" width="15px" />
      <WebhookFeedbackTitle>{text}</WebhookFeedbackTitle>
    </WebhookFeedbackWrapper>
  );
};

// TODO: Render based on API response. So far we do placeholders.
export const ExecutionDetailsWebhookFeedback = ({ show }) => {
  if (!show) {
    return null;
  }

  return (
    <Group position="right" spacing="xs">
      <WebhookFeedback icon={Sent} text="Sent" />
      <WebhookFeedback icon={Received} text="Received" />
      <WebhookFeedback icon={Read} text="Read" />
      <WebhookFeedback icon={Seen} text="Seen" />
      <WebhookFeedback icon={Clicked} text="Clicked" />
    </Group>
  );
};
