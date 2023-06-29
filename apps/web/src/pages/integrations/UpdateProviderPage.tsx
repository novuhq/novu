import { useEffect, useMemo, useState } from 'react';
import { ChannelTypeEnum, IConfigCredentials } from '@novu/shared';
import { ActionIcon, Group, useMantineColorScheme, Loader, Center, Stack } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import styled from '@emotion/styled';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import slugify from 'slugify';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { Button, colors, Input, NameInput, Switch, Text } from '../../design-system';
import { Check, Close, Copy, DisconnectGradient } from '../../design-system/icons';
import { useProviders } from './useProviders';
import { IIntegratedProvider } from './IntegrationsStoreModal';
import { IntegrationInput } from './components/IntegrationInput';
import { IntegrationChannel } from './components/IntegrationChannel';
import { CHANNEL_TYPE_TO_STRING } from '../../utils/channels';
import { IntegrationEnvironmentPill } from './components/IntegrationEnvironmentPill';
import { useFetchEnvironments } from '../../hooks/useFetchEnvironments';
import { ProviderImage } from './components/multi-provider/SelectProviderSidebar';
import { When } from '../../components/utils/When';

interface IProviderForm {
  name: string;
  credentials: Record<string, string>;
  active: boolean;
  identifier: string;
}

const schema = z
  .object({
    identifier: z
      .string({
        required_error: 'Required - Instance key',
      })
      .superRefine((data, ctx) => {
        const regexp = new RegExp(/^[A-Za-z_-]+$/);
        if (!regexp.test(data)) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_string,
            validation: 'regex',
            message: 'Instance key must only contains alphabetical, dash and underscore characters',
          });
        }
      }),
  })
  .passthrough();

export function UpdateProviderPage() {
  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const { providers, refetch, isLoading } = useProviders();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { integrationId } = useParams();
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<IProviderForm>({
    shouldUseNativeValidation: false,
    resolver: zodResolver(schema),
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

        return value === undefined || value === null || value.length === 0;
      });

    return missingCredentials.length === 0;
  }, [credentials, selectedProvider]);

  const isActive = watch('active');
  const name = watch('name');
  const identifier = watch('identifier');
  const identifierClipboard = useClipboard({ timeout: 1000 });

  useEffect(() => {
    if (!selectedProvider?.displayName.includes(name)) {
      return;
    }
    const newIdentifier = slugify(name, {
      lower: true,
      strict: true,
    });

    if (newIdentifier === identifier) {
      return;
    }

    setValue('identifier', newIdentifier);
  }, [name]);

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
      name: foundProvider.displayName,
      credentials: foundProvider.credentials.reduce((prev, credential) => {
        prev[credential.key] = credential.value;

        return prev;
      }, {} as any),
      active: foundProvider.active,
    });
  }, [integrationId, providers]);

  if (isLoading || areEnvironmentsLoading) {
    return (
      <SideBarWrapper dark={isDark}>
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

  return (
    <SideBarWrapper dark={isDark}>
      <Form
        name={'connect-integration-form'}
        noValidate
        onSubmit={(e) => {
          handleSubmit((values) => {
            refetch();
          });
          e.preventDefault();
        }}
      >
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
                  value={field.value !== undefined ? field.value : selectedProvider?.displayName}
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
        <Group mb={16} mt={16} spacing={16}>
          <IntegrationChannel
            name={CHANNEL_TYPE_TO_STRING[selectedProvider?.channel || ChannelTypeEnum.EMAIL]}
            type={selectedProvider?.channel || ChannelTypeEnum.EMAIL}
          />
          <IntegrationEnvironmentPill
            name={
              environments?.find((environment) => environment._id === selectedProvider?.environmentId)?.name ||
              'Development'
            }
          />
        </Group>
        <CenterDiv>
          <When truthy={haveAllCredentials}>
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
          <ActiveWrapper active={isActive}>
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Switch
                  checked={isActive}
                  label={isActive ? 'Active' : 'Disabled'}
                  data-test-id="is_active_id"
                  {...field}
                />
              )}
            />
          </ActiveWrapper>
          <Controller
            control={control}
            name="identifier"
            render={({ field }) => (
              <InputWrapper>
                <Input
                  label="Instance key"
                  error={errors.identifier?.message}
                  rightSection={
                    <CopyWrapper onClick={() => identifierClipboard.copy(field.value)}>
                      {identifierClipboard.copied ? <Check /> : <Copy />}
                    </CopyWrapper>
                  }
                  {...field}
                />
              </InputWrapper>
            )}
          />
          {selectedProvider?.credentials.map((credential: IConfigCredentials) => (
            <InputWrapper key={credential.key}>
              <Controller
                name={`credentials.${credential.key}`}
                control={control}
                render={({ field }) => <IntegrationInput credential={credential} errors={errors} field={field} />}
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
          <Button disabled={!isDirty} submit={true}>
            Update
          </Button>
        </Group>
      </Form>
    </SideBarWrapper>
  );
}

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)} !important;
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

  ${StyledText} {
    color: ${({ active }) => (active ? colors.success : colors.error)};
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
