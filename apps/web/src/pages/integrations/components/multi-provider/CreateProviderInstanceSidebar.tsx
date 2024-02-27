import { Group, Radio, Text, Input, useMantineTheme } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { useDisclosure } from '@mantine/hooks';
import { ChannelTypeEnum, NOVU_PROVIDERS, providers } from '@novu/shared';
import type { IResponseError, ICreateIntegrationBodyDto } from '@novu/shared';
import {
  ActionButton,
  Button,
  colors,
  NameInput,
  Sidebar,
  ConditionPlus,
  ArrowLeft,
  Condition,
  inputStyles,
} from '@novu/design-system';

import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { createIntegration } from '../../../../api/integration';
import { defaultIntegrationConditionsProps, IntegrationsStoreModalAnalytics } from '../../constants';
import { errorMessage, successMessage } from '../../../../utils/notifications';
import { QueryKeys } from '../../../../api/query.keys';
import { ProviderImage } from './SelectProviderSidebar';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import type { IntegrationEntity } from '../../types';
import { useProviders } from '../../useProviders';
import { When } from '../../../../components/utils/When';
import { Conditions, IConditions } from '../../../../components/conditions';
import { ConditionIconButton } from '../ConditionIconButton';

interface ICreateProviderInstanceForm {
  name: string;
  environmentId: string;
  conditions: IConditions[];
}

export function CreateProviderInstanceSidebar({
  isOpened,
  providerId,
  channel,
  onClose,
  onGoBack,
  onIntegrationCreated,
}: {
  isOpened: boolean;
  channel?: string;
  providerId?: string;
  onClose: () => void;
  onGoBack: () => void;
  onIntegrationCreated: (id: string) => void;
}) {
  const { colorScheme } = useMantineTheme();
  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const { isLoading: areIntegrationsLoading, providers: integrations } = useProviders();
  const isLoading = areEnvironmentsLoading || areIntegrationsLoading;
  const queryClient = useQueryClient();
  const segment = useSegment();
  const [conditionsFormOpened, { close: closeConditionsForm, open: openConditionsForm }] = useDisclosure(false);

  const provider = useMemo(
    () => providers.find((el) => el.channel === channel && el.id === providerId),
    [channel, providerId]
  );

  const { mutateAsync: createIntegrationApi, isLoading: isLoadingCreate } = useMutation<
    IntegrationEntity,
    IResponseError,
    ICreateIntegrationBodyDto
  >(createIntegration);

  const { handleSubmit, control, reset, watch, setValue, getValues } = useForm<ICreateProviderInstanceForm>({
    shouldUseNativeValidation: false,
    defaultValues: {
      name: '',
      environmentId: '',
      conditions: [],
    },
  });

  const watchedConditions = watch('conditions');
  const numOfConditions: number = useMemo(() => {
    if (watchedConditions && watchedConditions[0] && watchedConditions[0].children) {
      return watchedConditions[0].children.length;
    }

    return 0;
  }, [watchedConditions]);

  const selectedEnvironmentId = watch('environmentId');

  const showNovuProvidersErrorMessage = useMemo(() => {
    if (!provider || integrations.length === 0 || !NOVU_PROVIDERS.includes(provider.id)) {
      return false;
    }

    const found = integrations.find((integration) => {
      return integration.providerId === provider.id && integration.environmentId === selectedEnvironmentId;
    });

    return found !== undefined;
  }, [integrations, provider, selectedEnvironmentId]);

  const onCreateIntegrationInstance = async (data: ICreateProviderInstanceForm) => {
    try {
      if (!provider) {
        return;
      }

      const { channel: selectedChannel } = provider;
      const { environmentId, conditions } = data;

      const { _id: integrationId } = await createIntegrationApi({
        providerId: provider.id,
        channel: selectedChannel,
        name: data.name,
        credentials: {},
        active: provider.channel === ChannelTypeEnum.IN_APP ? true : false,
        check: false,
        conditions,
        _environmentId: environmentId,
      });

      segment.track(IntegrationsStoreModalAnalytics.CREATE_INTEGRATION_INSTANCE, {
        providerId: provider.id,
        channel: selectedChannel,
        name: data.name,
        environmentId,
      });
      successMessage('Instance configuration is created');
      onIntegrationCreated(integrationId ?? '');

      queryClient.refetchQueries({
        predicate: ({ queryKey }) =>
          queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
      });
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error');
    }
  };

  useEffect(() => {
    if (!environments?.length) {
      return;
    }

    reset({
      name: provider?.displayName ?? '',
      environmentId: environments.find((env) => env.name === 'Development')?._id || '',
      conditions: [],
    });
  }, [reset, environments, provider]);

  if (!provider) {
    return null;
  }

  const updateConditions = (conditions: IConditions[]) => {
    setValue('conditions', conditions, { shouldDirty: true });
  };

  if (conditionsFormOpened) {
    const [conditions, name] = getValues(['conditions', 'name']);

    return (
      <Conditions
        conditions={conditions}
        name={name}
        isOpened={conditionsFormOpened}
        updateConditions={updateConditions}
        onClose={closeConditionsForm}
        {...defaultIntegrationConditionsProps}
      />
    );
  }

  return (
    <Sidebar
      isOpened={isOpened}
      isLoading={isLoading}
      onSubmit={(e) => {
        handleSubmit(onCreateIntegrationInstance)(e);
        e.stopPropagation();
      }}
      onClose={onClose}
      customHeader={
        <Group spacing={12} w="100%" h={40} noWrap>
          <ActionButton
            Icon={ArrowLeft}
            onClick={onGoBack}
            data-test-id="create-provider-instance-sidebar-back"
            sx={{
              '> svg': {
                width: 16,
                height: 16,
              },
            }}
          />
          <ProviderImage providerId={provider?.id ?? ''} />
          <Controller
            control={control}
            name="name"
            defaultValue=""
            render={({ field }) => {
              return (
                <NameInput
                  {...field}
                  value={field.value !== undefined ? field.value : provider.displayName}
                  data-test-id="provider-instance-name"
                  placeholder="Enter instance name"
                  ml={-10}
                />
              );
            }}
          />
          <Group mt={-10} spacing={12} align="start" noWrap ml="auto">
            <ConditionIconButton data-test-id="add-conditions-icon-btn" onClick={openConditionsForm} />
          </Group>
        </Group>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="create-provider-instance-sidebar-cancel">
            Cancel
          </Button>
          <Button
            disabled={isLoading || isLoadingCreate || showNovuProvidersErrorMessage}
            loading={isLoadingCreate}
            submit
            data-test-id="create-provider-instance-sidebar-create"
          >
            Create
          </Button>
        </Group>
      }
      data-test-id="create-provider-instance-sidebar"
    >
      <Text color={colors.B40}>
        Specify assignment preferences to automatically allocate the provider instance to the{' '}
        {CHANNEL_TYPE_TO_STRING[provider.channel]} channel.
      </Text>
      <Controller
        control={control}
        name={'environmentId'}
        defaultValue="Development"
        render={({ field }) => {
          return (
            <Radio.Group
              styles={inputStyles}
              sx={{
                ['.mantine-Group-root']: {
                  paddingTop: 0,
                  paddingLeft: '10px',
                },
              }}
              label="Environment"
              description="Provider instance executes only for"
              spacing={26}
              {...field}
            >
              {environments
                ?.map((environment) => {
                  return { value: environment._id, label: environment.name };
                })
                .map((option) => (
                  <Radio
                    styles={() => ({
                      radio: {
                        backgroundColor: 'transparent',
                        borderColor: colors.B60,
                        '&:checked': { borderColor: 'transparent' },
                      },
                      label: {
                        paddingLeft: 10,
                        fontSize: '14px',
                        fontWeight: 400,
                      },
                    })}
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  />
                ))}
            </Radio.Group>
          );
        }}
      />
      <Input.Wrapper
        label={
          <>
            <Group spacing={5}>
              Conditions
              <Text color={colors.B40} style={{ fontWeight: 'normal' }}>
                (optional)
              </Text>
            </Group>
          </>
        }
        description="Add a condition if you want to apply the provider instance to a specific tenant."
        styles={inputStyles}
      >
        <Group mt={16} position="left">
          <Button
            variant="outline"
            data-test-id="add-conditions-btn"
            onClick={openConditionsForm}
            icon={
              <>
                <When truthy={numOfConditions === 0}>
                  <Group spacing={8}>
                    <ConditionPlus />
                  </Group>
                </When>
                <When truthy={numOfConditions > 0}>
                  <Group spacing={2} color={colorScheme === 'dark' ? colors.white : colors.B30}>
                    <Condition />
                    {numOfConditions}
                  </Group>
                </When>
              </>
            }
          >
            {numOfConditions === 0 ? 'Add' : 'Edit'} conditions
          </Button>
        </Group>
      </Input.Wrapper>
      <When truthy={showNovuProvidersErrorMessage}>
        <WarningMessage>
          <Text data-test-id="novu-provider-error">
            You can only create one {provider.displayName} per environment.
          </Text>
        </WarningMessage>
      </When>
    </Sidebar>
  );
}

const WarningMessage = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 40px;
  color: #e54545;

  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
`;
