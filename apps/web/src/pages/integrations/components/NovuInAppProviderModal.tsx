import styled from '@emotion/styled/macro';
import { Button, colors } from '../../../design-system';
import { Close } from '../../../design-system/icons/actions/Close';
import { Title, Text, Grid, Stack, useMantineColorScheme } from '@mantine/core';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { useEffect, useState } from 'react';
import { createIntegration, updateIntegration } from '../../../api/integration';
import { useMutation } from '@tanstack/react-query';
import { ChannelTypeEnum, ICredentialsDto } from '@novu/shared';
import { useIntegrations } from '../../../hooks';
import { Switch } from '../../../design-system';
import { Controller, useForm } from 'react-hook-form';
import { CircleArrowRight } from '../../../design-system/icons/arrows/CircleArrowRight';
import { When } from '../../../components/utils/When';
import { showNotification } from '@mantine/notifications';
import { Link } from 'react-router-dom';

export const NovuInAppProviderModal = ({
  onClose,
  provider: defaultProvider,
  showModal,
}: {
  onClose: () => void;
  provider: IIntegratedProvider | null;
  showModal: (visible: boolean) => void;
}) => {
  const { colorScheme } = useMantineColorScheme();
  const { refetch } = useIntegrations();
  const [provider, setProvider] = useState<IIntegratedProvider | null>(defaultProvider);
  const [isActive, setIsActive] = useState<boolean>(!!provider?.active);
  const { handleSubmit, setValue, control, watch } = useForm({
    shouldUseNativeValidation: false,
  });
  const hmac = watch('hmac');

  const { mutateAsync: createIntegrationApi } = useMutation<
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
      setProvider({
        ...(provider as IIntegratedProvider),
        integrationId: data._id,
      });
      setIsActive(data.active);
      refetch();
    },
  });

  const { mutateAsync: updateIntegrationApi, isLoading: isLoadingUpdate } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    {
      integrationId: string;
      data: { credentials: ICredentialsDto; active: boolean; check: boolean };
    }
  >(({ integrationId, data }) => updateIntegration(integrationId, data));

  const onSubmit = async (credentials) => {
    try {
      await updateIntegrationApi({
        integrationId: provider?.integrationId ? provider?.integrationId : '',
        data: { credentials, active: isActive, check: false },
      });
    } catch (e: any) {
      return;
    }

    showNotification({
      message: `Successfully updated integration`,
      color: 'green',
    });

    showModal(false);
  };

  useEffect(() => {
    if (provider?.credentials) {
      for (const credential of provider.credentials) {
        if (credential.key === 'hmac') {
          setValue(credential.key, credential.value === 'true');
          continue;
        }
        setValue(credential.key, credential.value);
      }
    }
  }, [provider]);

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
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <CloseButton data-test-id="connection-integration-close" type="button" onClick={onClose}>
          <Close />
        </CloseButton>

        <Title
          sx={(theme) => ({
            fontWeight: 700,
            color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
          })}
          order={2}
          mb={24}
        >
          In-App notification center
        </Title>
        <Grid>
          <Grid.Col span={8}>
            <Text mb={10} color={colorScheme === 'dark' ? colors.white : colors.B40}>
              Security HMAC encryption
            </Text>
            <Text color={colorScheme === 'dark' ? colors.B80 : colors.B70}>
              Verify if a request is performed by a specific user
            </Text>
          </Grid.Col>
          <Grid.Col span={4}>
            <Stack
              justify="end"
              sx={{
                height: '100%',
              }}
              align="end"
            >
              <SideElementBase>
                <Controller
                  control={control}
                  name="hmac"
                  render={({ field }) => (
                    <Switch
                      data-test-id="connect-integration-in-app-hmac"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Text
                  data-test-id="connect-integration-in-app-hmac-text"
                  ml={10}
                  color={hmac ? colors.error : colors.B60}
                >
                  {hmac ? 'Active' : 'Not Active'}
                </Text>
              </SideElementBase>
            </Stack>
          </Grid.Col>
        </Grid>
        <When truthy={hmac}>
          <WarningMessage>
            <Text color={colorScheme === 'dark' ? colors.white : colors.B40}>
              To finish security enabling, follow the step-by-step guide in our docs
            </Text>
            <CircleArrowRightStyled
              onClick={() => {
                window.open('https://docs.novu.co/notification-center/headless/headless-service#hmac-encryption');
              }}
            />
          </WarningMessage>
        </When>
        <ActiveWrapper active={isActive}>
          <Switch
            checked={isActive}
            data-test-id="is_active_id"
            onChange={() => {
              setIsActive((prev) => !prev);
            }}
          />
          <StyledText data-test-id="connect-integration-form-active-text">
            {isActive ? 'Active' : 'Disabled'}
          </StyledText>
        </ActiveWrapper>
        <Button data-test-id="connect-integration-form-submit" submit mb={32} fullWidth loading={isLoadingUpdate}>
          Update
        </Button>
        <Text color={colors.B60}>
          <Text display="inline" color={colors.error}>
            <Link to="/quickstart/notification-center/set-up">Discover a guide</Link>
          </Text>{' '}
          of how to Integrate In-App using any framework
        </Text>
      </form>
    </div>
  );
};

const StyledText = styled(Text)`
  display: inline-block;
  word-break: normal;
  margin: 0 10px;
`;

const SideElementBase = styled.div`
  display: flex;
  justify-content: flex-start;
  & > :first-of-type {
    width: auto;
  }
`;

const ActiveWrapper = styled(SideElementBase)<{ active: boolean }>`
  align-items: center;
  margin-top: 32px;
  margin-bottom: 32px;

  ${StyledText} {
    color: ${({ active }) => (active ? colors.success : colors.error)};
  }
`;

const WarningMessage = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  color: #e54545;
  margin-top: 16px;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
`;

const CircleArrowRightStyled = styled(CircleArrowRight)`
  cursor: pointer;
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
