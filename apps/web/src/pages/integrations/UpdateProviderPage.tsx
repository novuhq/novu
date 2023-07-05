import { useEffect, useMemo, useState } from 'react';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  IConfigCredentials,
  ICredentialsDto,
  IUpdateIntegrationBodyDto,
  SmsProviderIdEnum,
} from '@novu/shared';
import { ActionIcon, Group, Loader, Center, Stack } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import styled from '@emotion/styled';
import slugify from 'slugify';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { Button, colors, Input, NameInput, Switch, Text, Title } from '../../design-system';
import { Check, Close, Copy, DisconnectGradient } from '../../design-system/icons';
import { useProviders } from './useProviders';
import { IIntegratedProvider } from './IntegrationsStorePage';
import { IntegrationInput } from './components/IntegrationInput';
import { IntegrationChannel } from './components/IntegrationChannel';
import { CHANNEL_TYPE_TO_STRING } from '../../utils/channels';
import { IntegrationEnvironmentPill } from './components/IntegrationEnvironmentPill';
import { useFetchEnvironments } from '../../hooks/useFetchEnvironments';
import { ProviderImage } from './components/multi-provider/SelectProviderSidebar';
import { When } from '../../components/utils/When';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateIntegration } from '../../api/integration';
import { QueryKeys } from '../../api/query.keys';
import { errorMessage, successMessage } from '../../utils/notifications';
import { NovuProviderSidebarContent } from './components/multi-provider/NovuProviderSidebarContent';

interface IProviderForm {
  name: string;
  credentials: ICredentialsDto;
  active: boolean;
  identifier: string;
}

const Info = ({ provider, environments }) => (
  <Group mb={16} mt={16} spacing={16}>
    <IntegrationChannel
      name={CHANNEL_TYPE_TO_STRING[provider?.channel || ChannelTypeEnum.EMAIL]}
      type={provider?.channel || ChannelTypeEnum.EMAIL}
    />
    <IntegrationEnvironmentPill
      name={environments?.find((environment) => environment._id === provider?.environmentId)?.name || 'Development'}
    />
  </Group>
);

export function UpdateProviderPage() {
  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const { providers, isLoading } = useProviders();
  const { integrationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutateAsync: updateIntegrationApi, isLoading: isLoadingUpdate } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    {
      id: string;
      data: IUpdateIntegrationBodyDto;
    }
  >(({ id, data }) => updateIntegration(id, data));

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<IProviderForm>({
    shouldUseNativeValidation: false,
    defaultValues: {
      name: '',
      credentials: {},
      active: false,
      identifier: '',
    },
  });

  const credentials = watch('credentials');

  const haveAllCredentials = useMemo(() => {
    if (selectedProvider === null) {
      return false;
    }
    const missingCredentials = selectedProvider.credentials
      .filter((credential) => credential.required)
      .filter((credential) => {
        const value = credentials[credential.key];

        return !value;
      });

    return missingCredentials.length === 0;
  }, [selectedProvider, credentials]);

  const identifierClipboard = useClipboard({ timeout: 1000 });

  async function onUpdateIntegration(data) {
    try {
      await updateIntegrationApi({
        id: selectedProvider?.integrationId ?? '',
        data: { ...data },
      });

      await queryClient.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes(QueryKeys.integrationsList),
      });

      successMessage('Instance configuration updated');
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error');
    }
  }

  useEffect(() => {
    if (selectedProvider && !selectedProvider?.identifier) {
      const newIdentifier = slugify(selectedProvider?.displayName, {
        lower: true,
        strict: true,
      });

      setValue('identifier', newIdentifier);
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (integrationId === undefined || providers.length === 0) {
      return;
    }
    const foundProvider = providers.find((provider) => provider.integrationId === integrationId);
    if (!foundProvider) {
      return;
    }

    setSelectedProvider(foundProvider);
    reset({
      name: foundProvider.name,
      identifier: foundProvider.identifier,
      credentials: foundProvider.credentials.reduce((prev, credential) => {
        prev[credential.key] = credential.value;

        return prev;
      }, {} as any),
      active: foundProvider.active,
    });
  }, [integrationId, providers]);

  if (isLoading || areEnvironmentsLoading) {
    return (
      <SideBarWrapper>
        <Stack
          align="center"
          justify="center"
          sx={{
            height: '100%',
          }}
        >
          <Loader color={colors.error} size={32} />
        </Stack>
      </SideBarWrapper>
    );
  }

  if (selectedProvider === null) {
    return null;
  }

  if (
    SmsProviderIdEnum.Novu === selectedProvider.providerId ||
    EmailProviderIdEnum.Novu === selectedProvider.providerId
  ) {
    return (
      <SideBarWrapper>
        <Group position="apart">
          <Group spacing={12}>
            <ProviderImage providerId={selectedProvider?.providerId} />
            <Title size={2}>{selectedProvider?.displayName}</Title>
            <Free>🎉 Free</Free>
          </Group>
          <ActionIcon
            variant={'transparent'}
            onClick={() => {
              navigate('/integrations');
            }}
          >
            <Close color={colors.B40} />
          </ActionIcon>
        </Group>
        <Info provider={selectedProvider} environments={environments} />
        <CenterDiv>
          <NovuProviderSidebarContent provider={selectedProvider} />
        </CenterDiv>
        <When truthy={selectedProvider?.docReference}>
          <Group spacing={0}>
            <Text mr={5}>Read more in</Text>
            <Text gradient>
              <a href={selectedProvider?.docReference} target="_blank" rel="noopener noreferrer">
                our docs
              </a>
            </Text>
          </Group>
        </When>
      </SideBarWrapper>
    );
  }

  return (
    <SideBarWrapper>
      <Form name={'connect-integration-form'} noValidate onSubmit={handleSubmit(onUpdateIntegration)}>
        <Group spacing={5}>
          <ProviderImage providerId={selectedProvider?.providerId} />
          <Controller
            control={control}
            name="name"
            defaultValue=""
            render={({ field }) => {
              return (
                <NameInput
                  {...field}
                  value={field.value ? field.value : selectedProvider?.displayName}
                  data-test-id="provider-instance-name"
                  placeholder="Enter instance name"
                />
              );
            }}
          />
          <ActionIcon
            variant={'transparent'}
            onClick={() => {
              navigate('/integrations');
            }}
          >
            <Close color={colors.B40} />
          </ActionIcon>
        </Group>
        <Info provider={selectedProvider} environments={environments} />
        <CenterDiv>
          <When truthy={!haveAllCredentials}>
            <WarningMessage spacing={12}>
              <DisconnectGradient />
              <div>
                Set up credentials to start sending notifications
                <br />
                <a href={selectedProvider?.docReference} target="_blank" rel="noopener noreferrer">
                  Explore set-up guide
                </a>
              </div>
            </WarningMessage>
          </When>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Switch
                checked={field.value}
                label={field.value ? 'Active' : 'Disabled'}
                data-test-id="is_active_id"
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="name"
            defaultValue={''}
            rules={{
              required: 'Required - Instance name',
            }}
            render={({ field }) => (
              <InputWrapper>
                <Input
                  {...field}
                  value={field.value ? field.value : selectedProvider?.displayName}
                  required
                  label="Name"
                  error={errors.name?.message}
                />
              </InputWrapper>
            )}
          />
          <Controller
            control={control}
            name="identifier"
            defaultValue={''}
            rules={{
              required: 'Required - Instance key',
              pattern: {
                value: /^[A-Za-z0-9_-]+$/,
                message: 'Instance key must contains only alphabetical, numeric, dash or underscore characters',
              },
            }}
            render={({ field }) => (
              <InputWrapper>
                <Input
                  {...field}
                  required
                  label="Instance key"
                  error={errors.identifier?.message}
                  rightSection={
                    <CopyWrapper onClick={() => identifierClipboard.copy(field.value)}>
                      {identifierClipboard.copied ? <Check /> : <Copy />}
                    </CopyWrapper>
                  }
                />
              </InputWrapper>
            )}
          />
          {selectedProvider?.credentials.map((credential: IConfigCredentials) => (
            <InputWrapper key={credential.key}>
              <Controller
                name={`credentials.${credential.key}`}
                control={control}
                defaultValue=""
                rules={{ required: `Please enter a ${credential.displayName.toLowerCase()}` }}
                render={({ field }) => (
                  <IntegrationInput
                    credential={credential}
                    errors={errors?.credentials ? errors?.credentials : {}}
                    field={field}
                  />
                )}
              />
            </InputWrapper>
          ))}
        </CenterDiv>
        <Group mt={16} position="apart">
          <Center inline>
            <Text mr={5}>Explore our</Text>
            <Text gradient>
              <a href={selectedProvider?.docReference} target="_blank" rel="noopener noreferrer">
                set-up guide
              </a>
            </Text>
          </Center>
          <Button disabled={!isDirty} submit loading={isLoadingUpdate}>
            Update
          </Button>
        </Group>
      </Form>
    </SideBarWrapper>
  );
}

const SideBarWrapper = styled.div`
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.white)} !important;
  position: absolute;
  z-index: 1;
  width: 480px;
  height: 100%;
  top: 0;
  bottom: 0;
  right: 0;
  padding: 24px;
`;

const InputWrapper = styled.div`
  margin-top: 32px;
  label {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
  }
`;

const CenterDiv = styled.div`
  overflow: scroll;
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
  max-height: calc(100% - 160px);
  height: calc(100% - 160px);
  margin-bottom: 16px;
`;

const CopyWrapper = styled.div`
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const Form = styled.form`
  height: 100%;
`;

const WarningMessage = styled(Group)`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 15px;
  margin-bottom: 24px;
  color: #e54545;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
  a {
    text-decoration: underline;
  }
`;

const Free = styled.span`
  color: ${colors.success};
  font-size: 14px;
  min-width: fit-content;
  margin-left: -4px;
`;
