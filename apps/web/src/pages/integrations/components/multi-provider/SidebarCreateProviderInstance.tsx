import styled from '@emotion/styled';
import { ActionIcon, ColorScheme, Group, Radio, Text, TextInput, useMantineColorScheme } from '@mantine/core';
import { colors } from '../../../../design-system';
import { Close } from '../../../../design-system/icons/actions/Close';
import { Button } from '../../../../design-system';
import { ArrowLeft } from '../../../../design-system/icons';
import { Controller, useForm } from 'react-hook-form';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';
import { CONTEXT_PATH } from '../../../../config';
import { ChannelTypeEnum, ICredentialsDto, IProviderConfig } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { createIntegration } from '../../../../api/integration';
import { IntegrationsStoreModalAnalytics } from '../../constants';
import { errorMessage, successMessage } from '../../../../utils/notifications';
import { QueryKeys } from '../../../../api/query.keys';

const getLogoFileName = (id, schema: ColorScheme) => {
  if (schema === 'dark') {
    return `${CONTEXT_PATH}/static/images/providers/dark/square/${id}.svg`;
  }

  return `${CONTEXT_PATH}/static/images/providers/light/square/${id}.svg`;
};

export function SidebarCreateProviderInstance({
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

  const { colorScheme } = useMantineColorScheme();

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
        <img
          src={getLogoFileName(provider.id, colorScheme)}
          alt={provider.displayName}
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
                value={field.value !== undefined ? field.value : provider.displayName}
                type="text"
                data-test-id="title"
                placeholder="Enter workflow name"
              />
            );
          }}
        />
        <ActionIcon variant={'transparent'} onClick={onClose}>
          <Close color={colors.B40} />
        </ActionIcon>
      </Group>
      <Text py={24} color={colors.B40}>
        Specify assignment preferences to automatically allocate the provider instance to the {provider.channel}{' '}
        channel.
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

const Footer = styled.div`
  padding: 15px;
  height: 80px;
  display: flex;
  justify-content: right;
  align-items: center;
  gap: 20px;
`;

const FormStyled = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;

  > *:last-child {
    margin-top: auto;
  }
`;
