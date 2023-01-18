import styled from '@emotion/styled/macro';
import { Image, useMantineColorScheme, Center, Group } from '@mantine/core';
import { colors, Title } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { Close } from '../../../design-system/icons/actions/Close';
import { LimitBar } from './LimitBar';

export function NovuEmailProviderModal({
  provider,
  onClose,
}: {
  provider: IIntegratedProvider | null;
  onClose: () => void;
}) {
  const { colorScheme } = useMantineColorScheme();

  const logoSrc = provider ? `/static/images/logo-formerly-${colorScheme}-bg.png` : '';

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
        <Group>
          <Image style={{ maxWidth: 140 }} radius="md" src={logoSrc} alt={`${provider?.providerId} image`} />
          <Title size={2}>Our gift to you</Title>
        </Group>
        <InlineDiv>
          Get ready to take your email game to the next level! We've set up an email provider for you. You can try it
          out for free.
        </InlineDiv>
        <Center>
          <LimitBar />
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
  flex-direction: row;
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
