import { useEffect, useMemo, useState } from 'react';
import { Group, Center, Box } from '@mantine/core';
import styled from '@emotion/styled';
import slugify from 'slugify';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { IConfigCredentials, ICredentialsDto, InAppProviderIdEnum } from '@novu/shared';

import { Button, colors, Sidebar, Text } from '../../design-system';
import { useProviders } from './useProviders';
import { IIntegratedProvider } from './IntegrationsStorePage';
import { IntegrationInput } from './components/IntegrationInput';
import { useFetchEnvironments } from '../../hooks/useFetchEnvironments';
import { useUpdateIntegration } from '../../api/hooks/useUpdateIntegration';
import { successMessage } from '../../utils/notifications';
import { UpdateIntegrationSidebarHeader } from './components/UpdateIntegrationSidebarHeader';
import { SetupWarning } from './components/SetupWarning';
import { UpdateIntegrationCommonFields } from './components/UpdateIntegrationCommonFields';
import { NovuInAppFrameworks } from './components/NovuInAppFrameworks';
import { FrameworkEnum } from '../quick-start/consts';
import { When } from '../../components/utils/When';
import { SetupTimeline } from '../quick-start/components/SetupTimeline';
import { Faq } from '../quick-start/components/QuickStartWrapper';
import { NovuInAppFrameworkHeader } from './components/NovuInAppFrameworkHeader';
import { NovuInAppSetupWarning } from './components/NovuInAppSetupWarning';

interface IProviderForm {
  name: string;
  credentials: ICredentialsDto;
  active: boolean;
  identifier: string;
}

export function UpdateProviderPage() {
  const { isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const [sidebarState, setSidebarState] = useState<'normal' | 'expanded'>('normal');
  const [framework, setFramework] = useState<FrameworkEnum | null>(null);
  const { providers, isLoading } = useProviders();
  const { integrationId } = useParams();
  const navigate = useNavigate();
  const isNovuInAppProvider = selectedProvider?.providerId === InAppProviderIdEnum.Novu;

  const { onUpdateIntegration, isLoadingUpdate } = useUpdateIntegration(selectedProvider?.integrationId || '');

  const methods = useForm<IProviderForm>({
    shouldUseNativeValidation: false,
    shouldFocusError: false,
    defaultValues: {
      name: '',
      credentials: {},
      active: false,
      identifier: '',
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = methods;

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
      name: foundProvider.name ?? foundProvider.displayName,
      identifier: foundProvider.identifier,
      credentials: foundProvider.credentials.reduce((prev, credential) => {
        prev[credential.key] = credential.value;

        return prev;
      }, {} as any),
      active: foundProvider.active,
    });
  }, [integrationId, providers]);

  const onFrameworkClickCallback = (newFramework: FrameworkEnum) => {
    setSidebarState('expanded');
    setFramework(newFramework);
  };

  const onClose = () => {
    navigate('/integrations');
  };

  const onBack = () => {
    if (sidebarState === 'expanded') {
      setSidebarState('normal');
      setFramework(null);
    }
  };

  return (
    <FormProvider {...methods}>
      <Sidebar
        isOpened={!!selectedProvider}
        isLoading={isLoading || areEnvironmentsLoading}
        isExpanded={sidebarState === 'expanded'}
        onSubmit={handleSubmit(onUpdateIntegration)}
        onClose={onClose}
        onBack={onBack}
        customHeader={
          sidebarState === 'normal' ? (
            <UpdateIntegrationSidebarHeader provider={selectedProvider} />
          ) : (
            <>
              <When truthy={isNovuInAppProvider}>
                <NovuInAppFrameworkHeader framework={framework} />
              </When>
            </>
          )
        }
        customFooter={
          <Group position="apart" w="100%">
            <Center inline>
              <Text mr={5}>Explore our</Text>
              <Text gradient>
                <a href={selectedProvider?.docReference} target="_blank" rel="noopener noreferrer">
                  set-up guide
                </a>
              </Text>
            </Center>
            <Button disabled={!isDirty || isLoadingUpdate} submit loading={isLoadingUpdate}>
              Update
            </Button>
          </Group>
        }
      >
        <When truthy={sidebarState === 'normal'}>
          <CenterDiv>
            <SetupWarning
              show={!haveAllCredentials}
              message="Set up credentials to start sending notifications."
              docReference={selectedProvider?.docReference}
            />
            {isNovuInAppProvider && <NovuInAppSetupWarning provider={selectedProvider} />}
            <UpdateIntegrationCommonFields provider={selectedProvider} />
            {selectedProvider?.credentials.map((credential: IConfigCredentials) => (
              <InputWrapper key={credential.key}>
                <Controller
                  name={`credentials.${credential.key}`}
                  control={control}
                  defaultValue={credential.type === 'boolean' || credential.type === 'switch' ? false : ''}
                  rules={{
                    required: credential.required
                      ? `Please enter a ${credential.displayName.toLowerCase()}`
                      : undefined,
                  }}
                  render={({ field }) => (
                    <IntegrationInput credential={credential} errors={errors?.credentials ?? {}} field={field} />
                  )}
                />
              </InputWrapper>
            ))}
            {isNovuInAppProvider && <NovuInAppFrameworks onFrameworkClick={onFrameworkClickCallback} />}
          </CenterDiv>
        </When>
        <When truthy={isNovuInAppProvider && sidebarState === 'expanded'}>
          <SetupTimeline
            framework={framework?.toString() ?? ''}
            onDone={() => {
              setSidebarState('normal');
              successMessage('Successfully configured Novu In-App');
            }}
            onConfigureLater={() => {
              setSidebarState('normal');
            }}
          />
          <Box ml={70}>
            <Faq />
          </Box>
        </When>
      </Sidebar>
    </FormProvider>
  );
}

const InputWrapper = styled.div`
  margin-top: 32px;
`;

const CenterDiv = styled.div`
  overflow-y: auto;
  color: ${colors.B60};
  font-size: 14px;
  line-height: 20px;
  margin-bottom: 16px;
  padding-right: 5px;
`;
