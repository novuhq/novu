import { ActionIcon, Group, Radio, Text } from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChannelTypeEnum, ICredentialsDto, IProviderConfig } from '@novu/shared';
import { Controller, useForm } from 'react-hook-form';
import { colors, NameInput, Button } from '../../../../design-system';
import { ArrowLeft, Close } from '../../../../design-system/icons';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { createIntegration } from '../../../../api/integration';
import { IntegrationsStoreModalAnalytics } from '../../constants';
import { errorMessage, successMessage } from '../../../../utils/notifications';
import { QueryKeys } from '../../../../api/query.keys';
import { ProviderImage, Footer, FormStyled } from './SelectProviderSidebar';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';

export function CreateProviderInstanceSidebar({
  onClose,
  provider,
  goBack,
}: {
  onClose: () => void;
  goBack: () => void;
  provider: IProviderConfig;
}) {
  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const queryClient = useQueryClient();
  const segment = useSegment();

  const { mutateAsync: createIntegrationApi, isLoading: isLoadingCreate } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    {
      providerId: string;
      channel: ChannelTypeEnum | null;
      credentials: ICredentialsDto;
      active: boolean;
      check: boolean;
    }
  >(createIntegration);

  const { handleSubmit, control } = useForm({
    shouldUseNativeValidation: false,
    defaultValues: {
      name: provider.displayName,
      environmentId: environments?.find((env) => env.name === 'Development')?._id || '',
    },
  });

  const onCreateIntegrationInstance = async (data) => {
    try {
      await createIntegrationApi({
        providerId: provider?.id,
        channel: provider?.channel,
        credentials: {},
        active: false,
        check: false,
      });
      segment.track(IntegrationsStoreModalAnalytics.CREATE_INTEGRATION_INSTANCE, {
        providerId: provider?.id,
        channel: provider?.channel,
        name: data.name,
        environmentId: data.environmentId,
      });
      await queryClient.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes(QueryKeys.integrationsList),
      });
      successMessage('Instance configuration is created');
      onClose();
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error');
    }
  };

  return (
    <FormStyled onSubmit={handleSubmit(onCreateIntegrationInstance)}>
      <Group spacing={5}>
        <ActionIcon onClick={goBack} variant={'transparent'}>
          <ArrowLeft color={colors.B80} />
        </ActionIcon>
        <ProviderImage providerId={provider.id} />
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
              />
            );
          }}
        />
        <ActionIcon variant={'transparent'} onClick={onClose}>
          <Close color={colors.B40} />
        </ActionIcon>
      </Group>
      <Text py={24} color={colors.B40}>
        Specify assignment preferences to automatically allocate the provider instance to the{' '}
        {CHANNEL_TYPE_TO_STRING[provider.channel]} channel.
      </Text>
      <Controller
        control={control}
        name={'environmentId'}
        defaultValue=""
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
      <Footer>
        <Group>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isLoadingCreate} submit>
            Create
          </Button>
        </Group>
      </Footer>
    </FormStyled>
  );
}
