import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { ActionIcon, ColorScheme, Group, TextInput, useMantineColorScheme } from '@mantine/core';
import { colors } from '../../design-system';
import { useNavigate, useParams } from 'react-router-dom';
import { useProviders } from './useProviders';
import { IIntegratedProvider } from './IntegrationsStoreModal';
import { Close } from '../../design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { CONTEXT_PATH } from '../../config';
import { IConfigCredentials } from '@novu/shared';
import { IntegrationInput } from './components/IntegrationInput';

const getLogoFileName = (id, schema: ColorScheme) => {
  if (schema === 'dark') {
    return `${CONTEXT_PATH}/static/images/providers/dark/square/${id}.svg`;
  }

  return `${CONTEXT_PATH}/static/images/providers/light/square/${id}.svg`;
};

export function UpdateProviderPage() {
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const { providers } = useProviders();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { integrationId } = useParams();
  const navigate = useNavigate();

  const {
    control,
    setValue,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    shouldUseNativeValidation: false,
  });

  useEffect(() => {
    if (integrationId === undefined || providers.length === 0) {
      return;
    }
    if (selectedProvider !== null && selectedProvider.integrationId === integrationId) {
      return;
    }
    const foundProvider = providers.find((provider) => provider.integrationId === integrationId);

    if (!foundProvider) {
      return;
    }

    setSelectedProvider(foundProvider);
    reset({
      ...foundProvider,
      credentials: foundProvider.credentials.reduce((prev, credential) => {
        prev[credential.key] = credential.value;

        return prev;
      }, {} as any),
    });
  }, [integrationId, providers]);

  if (selectedProvider === null) {
    return null;
  }

  return (
    <SideBarWrapper dark={isDark}>
      <form
        name={'connect-integration-form'}
        noValidate
        onSubmit={(e) => {
          handleSubmit((values) => {});
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
            render={({ field, fieldState }) => {
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
        {selectedProvider?.credentials.map((credential: IConfigCredentials) => (
          <InputWrapper key={credential.key}>
            <Controller
              name={`credentials.${credential.key}`}
              control={control}
              render={({ field }) => (
                <IntegrationInput credential={credential} errors={errors} field={field} register={register} />
              )}
            />
          </InputWrapper>
        ))}
      </form>
    </SideBarWrapper>
  );
}

const SideBarWrapper = styled.div<{ dark: boolean }>`
  background-color: ${({ dark }) => (dark ? colors.B17 : colors.white)} !important;
  position: absolute;
  z-index: 1;
  width: 480px;
  top: 0;
  bottom: 0;
  right: 0;
  padding: 24px;
`;

const InputWrapper = styled.div`
  margin-bottom: 30px;
  label {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
  }
`;
