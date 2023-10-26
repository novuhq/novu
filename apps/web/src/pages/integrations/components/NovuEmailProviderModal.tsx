import styled from '@emotion/styled/macro';
import { List, Text } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { colors } from '@novu/design-system';
import { NovuProviderBase } from './NovuProviderBase';

export function NovuEmailProviderModal({ onClose }: { onClose: () => void }) {
  return (
    <NovuProviderBase
      onClose={onClose}
      channel={ChannelTypeEnum.EMAIL}
      senderInformation={<EmailSenderInformation />}
    />
  );
}

function EmailSenderInformation() {
  const { currentOrganization } = useAuthContext();

  return (
    <div>
      <Text>Emails are sent on behalf of the:</Text>
      <List pl={5}>
        <List.Item>
          <Text>
            Sender name: <SenderDetailSpan>{currentOrganization?.name || 'Novu'}</SenderDetailSpan>
          </Text>
        </List.Item>
        <List.Item>
          <Text>
            Sender's email address: <SenderDetailSpan>no-reply@novu.co</SenderDetailSpan>
          </Text>
        </List.Item>
      </List>
    </div>
  );
}

const SenderDetailSpan = styled.span`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B40)};
`;
