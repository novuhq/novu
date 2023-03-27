import styled from '@emotion/styled/macro';
import { colors, Text } from '../../../design-system';
import { Close } from '../../../design-system/icons/actions/Close';
import { Title, Center } from '@mantine/core';
import { GotAQuestionButton } from '../../../components/utils/GotAQuestionButton';

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

export const NovuInAppProviderModal = ({ onClose }: { onClose: () => void }) => (
  <div
    style={{
      position: 'relative',
    }}
  >
    <CloseButton data-test-id="connection-integration-close" type="button" onClick={onClose}>
      <Close />
    </CloseButton>

    <Title
      align="center"
      sx={(theme) => ({
        fontWeight: 700,
        color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
      })}
      order={2}
    >
      Novu’s Notification Center
    </Title>
    <Text mt={16}>
      Our notification center can be used for free!
      <br />
      Novu allows up to 60,000 events / month without any payment.
    </Text>
    <Text mt={16}>
      This includes all of the suite of features we have for the notification center including Feeds, Seen/Read events
      and our is-online cross-channel filter.
    </Text>
    <Text mt={16}>
      Our notification center speaks all modern frontend frameworks including Vue, Angular, React and embedded.
    </Text>
    <Text mt={16}>If you are just getting started we recommend checking the Getting Started Guide.</Text>
    <Center>
      <GotAQuestionButton mt={30} size="lg" />
    </Center>
  </div>
);
