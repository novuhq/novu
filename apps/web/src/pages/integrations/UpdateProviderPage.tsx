import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ActionIcon, ColorScheme, Group, TextInput, useMantineColorScheme, Text, Loader } from '@mantine/core';
import { Button, colors, Input, Switch } from '../../design-system';
import { useNavigate, useParams } from 'react-router-dom';
import { useProviders } from './useProviders';
import { IIntegratedProvider } from './IntegrationsStoreModal';
import { Check, Close, Copy } from '../../design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { CONTEXT_PATH } from '../../config';
import { IConfigCredentials } from '@novu/shared';
import { IntegrationInput } from './components/IntegrationInput';
import { useClipboard } from '@mantine/hooks';
import slugify from 'slugify';
import { IntegrationChannel } from './components/IntegrationChannel';
import { CHANNEL_TYPE_TO_STRING } from '../../utils/channels';
import { IntegrationEnvironmentPill } from './components/IntegrationEnvironmentPill';
import { useFetchEnvironments } from '../../hooks/useFetchEnvironments';

const getLogoFileName = (id, schema: ColorScheme) => {
  if (schema === 'dark') {
    return `${CONTEXT_PATH}/static/images/providers/dark/square/${id}.svg`;
  }

  return `${CONTEXT_PATH}/static/images/providers/light/square/${id}.svg`;
};

interface IProviderForm {
  name: string;
  credentials: Record<string, string>;
  active: boolean;
  identifier: string;
}

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
    defaultValues: {
      name: '',
      credentials: {},
      active: false,
      identifier: '',
    },
  });

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
        <Loader color={colors.error} size={32} />
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
          <img
            src={getLogoFileName(selectedProvider.providerId, colorScheme)}
            alt={selectedProvider.displayName}
            style={{
              height: '24px',
              maxWidth: '140px',
            }}
          />
          <Controller
            control={control}
            name="name"
            defaultValue=""
            render={({ field }) => {
              return (
                <TextInput
                  styles={(theme) => ({
                    root: {
                      flex: '1 1 auto',
                    },
                    wrapper: {
                      background: 'transparent',
                      width: '100%',
                    },
                    input: {
                      background: 'transparent',
                      borderStyle: 'solid',
                      borderColor: colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5],
                      borderWidth: '1px',
                      fontSize: '20px',
                      fontWeight: 'bolder',
                      padding: 9,
                      lineHeight: '28px',
                      minHeight: 'auto',
                      height: 'auto',
                      width: '100%',
                      textOverflow: 'ellipsis',
                      '&:not(:placeholder-shown)': {
                        borderStyle: 'none',
                        padding: 10,
                      },
                      '&:hover, &:focus': {
                        borderStyle: 'solid',
                        padding: 9,
                      },
                      '&:disabled': {
                        backgroundColor: colorScheme === 'dark' ? colors.B15 : theme.white,
                        color: colorScheme === 'dark' ? theme.white : theme.black,
                        opacity: 1,
                      },
                    },
                  })}
                  {...field}
                  value={field.value !== undefined ? field.value : selectedProvider.displayName}
                  // error={showErrors && fieldState.error?.message}
                  type="text"
                  data-test-id="title"
                  placeholder="Enter workflow name"
                  // disabled={readonly}
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
        <Group mb={16} spacing={16}>
          <IntegrationChannel name={CHANNEL_TYPE_TO_STRING[selectedProvider.channel]} type={selectedProvider.channel} />
          <IntegrationEnvironmentPill
            name={
              environments?.find((environment) => environment._id === selectedProvider.environmentId)?.name ||
              'Development'
            }
          />
        </Group>
        <CenterDiv>
          <ActiveWrapper active={isActive}>
            <Controller
              control={control}
              name="active"
              render={({ field }) => <Switch checked={isActive} data-test-id="is_active_id" {...field} />}
            />
            <StyledText data-test-id="connect-integration-form-active-text">
              {isActive ? 'Active' : 'Disabled'}
            </StyledText>
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
          <Text>
            Explore our{' '}
            <a
              style={{
                color: colors.error,
              }}
              href={selectedProvider.docReference}
              target="_blank"
              rel="noopener noreferrer"
            >
              set-up guide
            </a>
          </Text>
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
  margin-top: 30px;
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
