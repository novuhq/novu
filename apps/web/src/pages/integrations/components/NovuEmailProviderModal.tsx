import styled from '@emotion/styled/macro';
import { Center, Title, Text } from '@mantine/core';
import { colors } from '../../../design-system';
import { Close } from '../../../design-system/icons/actions/Close';
import { LimitBar } from './LimitBar';
import { useAuthContext } from '../../../components/providers/AuthProvider';

export function NovuEmailProviderModal({ onClose }: { onClose: () => void }) {
  const { currentOrganization } = useAuthContext();

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <CloseButton data-test-id="connection-integration-form-close" type="button" onClick={onClose}>
        <Close />
      </CloseButton>

      <ColumnDiv>
        <Title align="center" order={2}>
          Our E-mail gift to you
        </Title>
        <InlineDiv>
          <Text>
            Get ready to take your email game to the next level! We've set up an email provider for you. You can try it
            out for free.
          </Text>
          <Text mt={16}>
            Using this provider your emails will be sent from no-reply@novu.co and with sender name{' '}
            {currentOrganization?.name || 'Novu'}.
          </Text>
        </InlineDiv>
        <Center>
          <LimitBar label={'Email credits used'} />
        </Center>
      </ColumnDiv>
    </div>
  );
}

const ColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
`;

const InlineDiv = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 30px;
  margin-top: 30px;

  span {
    margin-right: 5px;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  right: 0;
  top: 0;
  background: transparent;
  border: none;
  color: ${colors.B40};
  outline: none;

  &:hover {
    cursor: pointer;
  }
`;
