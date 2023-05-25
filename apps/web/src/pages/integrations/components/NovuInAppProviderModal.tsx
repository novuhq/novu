import { useEffect, useState } from 'react';
import styled from '@emotion/styled/macro';
import { Accordion, Box, Center, Loader, useMantineTheme } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { colors } from '../../../design-system';
import { Close } from '../../../design-system/icons/actions/Close';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { createIntegration } from '../../../api/integration';
import { useIntegrations } from '../../../hooks';
import { SetupTimeline } from '../../quick-start/components/SetupTimeline';
import { NovuInAppForm } from './NovuInAppForm';
import { When } from '../../../components/utils/When';
import { InAppSelectFramework } from './InAppSelectFramework';
import { Faq } from '../../quick-start/components/QuickStartWrapper';
import { SetupFrameworkHeader } from './SetupFrameworkHeader';
import { FrameworkDisplay } from './FrameworkDisplay';

export const NovuInAppProviderModal = ({
  onClose,
  provider: defaultProvider,
  showModal,
}: {
  onClose: () => void;
  provider: IIntegratedProvider | null;
  showModal: (visible: boolean) => void;
}) => {
  const { refetch } = useIntegrations();
  const [provider, setProvider] = useState<IIntegratedProvider | null>(defaultProvider);
  const [isActive, setIsActive] = useState<boolean>(!!provider?.active);
  const [framework, setFramework] = useState('');
  const [page, setPage] = useState<'setup' | 'form' | 'framework'>('form');
  const [created, setCreated] = useState(false);
  const theme = useMantineTheme();

  const { mutateAsync: createIntegrationApi, isLoading } = useMutation<
    { _id: string; active: boolean },
    { error: string; message: string; statusCode: number },
    {
      providerId: string;
      channel: ChannelTypeEnum | null;
      credentials: ICredentialsDto;
      active: boolean;
      check: boolean;
    }
  >(createIntegration, {
    onSuccess: (data) => {
      setCreated(true);
      setPage('framework');
      setProvider({
        ...(provider as IIntegratedProvider),
        integrationId: data._id,
      });
      setIsActive(data.active);
      refetch();
    },
  });

  useEffect(() => {
    if (!provider || provider?.connected) {
      return;
    }
    createIntegrationApi({
      providerId: provider?.providerId ? provider?.providerId : '',
      channel: provider?.channel ? provider?.channel : null,
      credentials: {
        hmac: false,
      },
      active: true,
      check: false,
    });
  }, [provider?.connected]);

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <When truthy={isLoading}>
        <Center>
          <Loader color={colors.error} size={32} />
        </Center>
      </When>
      <When truthy={!isLoading}>
        <When truthy={page === 'framework'}>
          <CloseButton data-test-id="connection-integration-close" type="button" onClick={onClose}>
            <Close />
          </CloseButton>
          <InAppSelectFramework
            setFramework={(newFramework) => {
              if (newFramework.length === 0) {
                setPage('form');

                return;
              }
              setFramework(newFramework);
              setPage('setup');
            }}
          />
        </When>
        <When truthy={page === 'form'}>
          <CloseButton data-test-id="connection-integration-close" type="button" onClick={onClose}>
            <Close />
          </CloseButton>
          <NovuInAppForm isActive={isActive} setIsActive={setIsActive} provider={provider} showModal={showModal} />
          <Accordion mt={-24}>
            <Accordion.Item
              value="framework-selection"
              sx={{
                borderBottom: 0,
                marginBottom: 0,
                background: theme.colorScheme === 'dark' ? undefined : colors.white,
              }}
            >
              <Accordion.Control>Discover a guide of how to Integrate In-App using any framework</Accordion.Control>
              <Accordion.Panel>
                <FrameworkDisplay
                  setFramework={(newFramework) => {
                    if (newFramework.length === 0) {
                      return;
                    }
                    setFramework(newFramework);
                    setPage('setup');
                  }}
                />
                <Box mt={24}>
                  <Faq />
                </Box>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </When>
        <When truthy={page === 'setup'}>
          <SetupFrameworkHeader
            onGoBack={() => {
              setPage(created ? 'framework' : 'form');
              setFramework('');
            }}
            onClose={onClose}
            framework={framework}
          />
          <div
            style={{
              marginTop: 97,
            }}
          >
            <SetupTimeline
              framework={framework}
              onDone={() => {
                setCreated(false);
                setPage('form');
              }}
              onConfigureLater={() => {
                setCreated(false);
                setPage('form');
              }}
            />
          </div>
          <Box ml={70}>
            <Faq />
          </Box>
        </When>
      </When>
    </div>
  );
};

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
