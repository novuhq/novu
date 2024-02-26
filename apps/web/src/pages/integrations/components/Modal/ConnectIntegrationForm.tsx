import { useEffect, useReducer, useRef } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClipboard } from '@mantine/hooks';
import { ActionIcon, Alert, Center, Image, Stack, useMantineColorScheme } from '@mantine/core';
import { WarningOutlined } from '@ant-design/icons';
import { ChannelTypeEnum, ChatProviderIdEnum, CredentialsKeyEnum, ProvidersIdEnum } from '@novu/shared';
import type {
  IResponseError,
  IConfigCredentials,
  ICreateIntegrationBodyDto,
  ICredentialsDto,
  IEnvironment,
  IOrganizationEntity,
} from '@novu/shared';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Button, colors, Input, shadows, Switch, Text, Close, Check, Copy } from '@novu/design-system';

import type { IIntegratedProvider } from '../../types';
import { createIntegration, getWebhookSupportStatus, updateIntegration } from '../../../../api/integration';
import { IntegrationInput } from '../IntegrationInput';
import { API_ROOT, CONTEXT_PATH } from '../../../../config';
import { successMessage } from '../../../../utils/notifications';
import { QueryKeys } from '../../../../api/query.keys';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { IntegrationsStoreModalAnalytics } from '../../constants';
import { When } from '../../../../components/utils/When';
import { useEnvController } from '../../../../hooks';

enum ACTION_TYPE_ENUM {
  HANDLE_SHOW_SWITCH = 'handle_show_switch',
  HANDLE_ALERT_AND_ERROR_MSG = 'handle_alert_and_error_msg',
  TOGGLE_CHECK = 'toggle_check',
  TOGGLE_IS_ACTIVE = 'set_is_active',
}

type ActionType =
  | { type: ACTION_TYPE_ENUM.TOGGLE_CHECK }
  | {
      type: ACTION_TYPE_ENUM.HANDLE_SHOW_SWITCH;
      payload: boolean;
    }
  | {
      type: ACTION_TYPE_ENUM.HANDLE_ALERT_AND_ERROR_MSG;
      payload: {
        isShowAlert: boolean;
        errorMsg: string;
      };
    }
  | {
      type: ACTION_TYPE_ENUM.TOGGLE_IS_ACTIVE;
    };

interface CheckIntegrationState {
  isActive: boolean;
  check: boolean;
  isShowSwitch: boolean;
  isShowAlert: boolean;
  errorMsg: string;
}

const checkIntegrationInitialState: CheckIntegrationState = {
  isActive: false,
  check: true,
  isShowSwitch: false,
  isShowAlert: false,
  errorMsg: '',
};

const checkIntegrationReducer = (
  state: typeof checkIntegrationInitialState,
  action: ActionType
): CheckIntegrationState => {
  switch (action.type) {
    case ACTION_TYPE_ENUM.HANDLE_SHOW_SWITCH:
      return {
        ...state,
        isShowSwitch: action.payload,
      };

    case ACTION_TYPE_ENUM.HANDLE_ALERT_AND_ERROR_MSG:
      return {
        ...state,
        isShowAlert: action.payload.isShowAlert,
        errorMsg: action.payload.errorMsg,
      };

    case ACTION_TYPE_ENUM.TOGGLE_CHECK:
      return {
        ...state,
        check: !state.check,
      };

    case ACTION_TYPE_ENUM.TOGGLE_IS_ACTIVE:
      return {
        ...state,
        isActive: !state.isActive,
      };

    default:
      return state;
  }
};

export function ConnectIntegrationForm({
  provider,
  organization,
  environment,
  createModel,
  onSuccessFormSubmit,
  onClose,
}: {
  provider: IIntegratedProvider;
  organization?: IOrganizationEntity;
  environment?: IEnvironment;
  createModel: boolean;
  onSuccessFormSubmit: () => void;
  onClose: () => void;
}) {
  const segment = useSegment();
  const alertRef = useRef<HTMLDivElement | null>(null);
  const {
    register,
    handleSubmit: handleSubmitIntegration,
    setValue,
    formState: { errors },
    control,
    watch,
  } = useForm({ shouldUseNativeValidation: false });

  const { colorScheme } = useMantineColorScheme();
  const webhookUrlClipboard = useClipboard({ timeout: 1000 });
  const [{ isActive, isShowAlert, isShowSwitch, check, errorMsg }, dispatch] = useReducer(checkIntegrationReducer, {
    ...checkIntegrationInitialState,
    isActive: !!provider?.active,
  });
  const queryClient = useQueryClient();

  const { mutateAsync: createIntegrationApi, isLoading: isLoadingCreate } = useMutation<
    { res: string },
    IResponseError,
    ICreateIntegrationBodyDto
  >(createIntegration);

  const { mutateAsync: updateIntegrationApi, isLoading: isLoadingUpdate } = useMutation<
    { res: string },
    IResponseError,
    {
      integrationId: string;
      data: { credentials: ICredentialsDto; active: boolean; check: boolean };
    }
  >(({ integrationId, data }) => updateIntegration(integrationId, data));

  const { data: webhookSupportStatus } = useQuery(
    ['webhookSupportStatus', provider?.providerId],
    () => getWebhookSupportStatus(provider?.providerId as string),
    {
      enabled: Boolean(
        provider?.providerId && [ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(provider.channel) && !createModel
      ),
    }
  );

  useEffect(() => {
    if (provider?.credentials) {
      for (const credential of provider.credentials) {
        setValue(credential.key, credential.value);
      }
    }
    if (provider) {
      dispatch({
        type: ACTION_TYPE_ENUM.HANDLE_ALERT_AND_ERROR_MSG,
        payload: {
          isShowAlert: false,
          errorMsg: '',
        },
      });
    }
  }, [setValue, provider]);

  async function onCreateIntegration(credentials: ICredentialsDto) {
    try {
      if (isShowAlert) {
        dispatch({
          type: ACTION_TYPE_ENUM.HANDLE_ALERT_AND_ERROR_MSG,
          payload: {
            isShowAlert: false,
            errorMsg: '',
          },
        });
      }
      if (createModel) {
        await createIntegrationApi({
          providerId: provider?.providerId ? provider?.providerId : '',
          channel: provider?.channel,
          credentials,
          active: isActive,
          check,
        });
        segment.track(IntegrationsStoreModalAnalytics.CREATE_INTEGRATION_FORM_SUBMIT, {
          providerId: provider?.providerId,
          channel: provider?.channel,
          name: provider?.displayName,
          active: provider?.active,
        });
      } else {
        await updateIntegrationApi({
          integrationId: provider?.integrationId ? provider?.integrationId : '',
          data: { credentials, active: isActive, check },
        });
        segment.track(IntegrationsStoreModalAnalytics.UPDATE_INTEGRATION_FORM_SUBMIT, {
          providerId: provider?.providerId,
          channel: provider?.channel,
          name: provider?.displayName,
          active: provider?.active,
        });
      }
      await queryClient.refetchQueries({
        predicate: ({ queryKey }) =>
          queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
      });
    } catch (e: any) {
      dispatch({
        type: ACTION_TYPE_ENUM.HANDLE_SHOW_SWITCH,
        payload: true,
      });
      dispatch({
        type: ACTION_TYPE_ENUM.HANDLE_ALERT_AND_ERROR_MSG,
        payload: {
          isShowAlert: true,
          errorMsg: e?.message,
        },
      });
      alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });

      return;
    }

    successMessage(`Successfully ${createModel ? 'added' : 'updated'} integration`);

    onSuccessFormSubmit();
    onClose();
  }

  function handlerSwitchChange() {
    dispatch({
      type: ACTION_TYPE_ENUM.TOGGLE_IS_ACTIVE,
    });
  }

  function handlerCheckIntegrationChange() {
    dispatch({
      type: ACTION_TYPE_ENUM.TOGGLE_CHECK,
    });
  }

  const logoSrc = provider
    ? `${CONTEXT_PATH}/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}`
    : '';

  // eslint-disable-next-line max-len
  const webhookUrl = `${API_ROOT}/v1/webhooks/organizations/${organization?._id}/environments/${environment?._id}/${provider?.channel}/${provider?.providerId}`;

  return (
    <FormStyled
      name={'connect-integration-form'}
      noValidate
      onSubmit={(e) => {
        handleSubmitIntegration(onCreateIntegration)(e);
        e.stopPropagation();
      }}
    >
      <Header>
        <Stack spacing={10}>
          <Image
            radius="md"
            height={50}
            width={140}
            fit={'contain'}
            src={logoSrc}
            alt={`${provider?.providerId} image`}
          />
          <Center inline>
            <Text>
              Take a look at{' '}
              <a href={provider?.docReference} target="_blank" rel="noreferrer" style={{ color: '#DD2476 ' }}>
                our guide
              </a>{' '}
              for how to connect <strong>{provider?.displayName}</strong>.
            </Text>
          </Center>
        </Stack>
        <ActionIcon
          mt={-50}
          mr={-10}
          variant={'transparent'}
          onClick={onClose}
          data-test-id="connection-integration-form-close"
        >
          <Close />
        </ActionIcon>
      </Header>

      <CenterDiv>
        {provider?.credentials.map((credential: IConfigCredentials) => (
          <InputWrapper key={`${credential.key}-${provider?.providerId}`}>
            <Controller
              name={credential.key}
              control={control}
              render={({ field }) => (
                <IntegrationInput credential={credential} errors={errors} field={field} register={register} />
              )}
            />
          </InputWrapper>
        ))}
        {webhookSupportStatus &&
          provider?.channel &&
          [ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(provider?.channel) && (
            <InputWrapper>
              <Input
                label="Webhook URL"
                value={webhookUrl}
                readOnly
                rightSection={
                  <CopyWrapper onClick={() => webhookUrlClipboard.copy(webhookUrl)}>
                    {webhookUrlClipboard.copied ? <Check /> : <Copy />}
                  </CopyWrapper>
                }
              />
            </InputWrapper>
          )}
        <ShareableUrl
          provider={provider?.providerId}
          hmacEnabled={useWatch({
            control,
            name: CredentialsKeyEnum.Hmac,
          })}
        />

        <Stack my={20}>
          <ActiveWrapper active={isActive}>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={isActive} data-test-id="is_active_id" {...field} onChange={handlerSwitchChange} />
              )}
            />
            <StyledText data-test-id="connect-integration-form-active-text">
              {isActive ? 'Active' : 'Disabled'}
            </StyledText>
          </ActiveWrapper>
          {provider?.channel === ChannelTypeEnum.EMAIL && isShowSwitch && (
            <CheckIntegrationWrapper>
              <Controller
                control={control}
                name="check"
                render={({ field }) => (
                  <Switch
                    checked={check}
                    data-test-id="is_check_integration_id"
                    {...field}
                    onChange={handlerCheckIntegrationChange}
                  />
                )}
              />
              <StyledText>Verify provider credentials</StyledText>
            </CheckIntegrationWrapper>
          )}
          <Alert
            ref={alertRef}
            icon={<WarningOutlined size={16} />}
            title="An error occurred!"
            color="red"
            mb={30}
            sx={{ display: isShowAlert ? 'initial' : 'none' }}
          >
            {errorMsg}
          </Alert>
        </Stack>
      </CenterDiv>
      <Footer>
        <Button onClick={onClose} variant={'outline'}>
          Cancel
        </Button>
        <Button submit loading={isLoadingUpdate || isLoadingCreate}>
          {createModel ? 'Connect' : 'Update'}
        </Button>
      </Footer>
    </FormStyled>
  );
}

const FormStyled = styled.form`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;

  > *:last-child {
    margin-top: auto;
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

const Footer = styled.div`
  padding: 15px;
  height: 80px;
  display: flex;
  justify-content: right;
  align-items: center;
  gap: 20px;
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
`;

const Header = styled.div`
  padding: 30px;
  height: 120px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: ${({ theme }) => (theme.colorScheme === 'dark' ? shadows.dark : shadows.medium)};
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const InputWrapper = styled.div`
  padding-bottom: 10px;
  label {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
  }
`;

const CheckIntegrationWrapper = styled(SideElementBase)`
  width: 100%;
  align-items: center;
  ${StyledText} {
    flex-grow: 1;
  }
`;

const CopyWrapper = styled.div`
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`;

const CenterDiv = styled.div`
  overflow: auto;
  padding: 30px;
`;

export function ShareableUrl({
  provider,
  hmacEnabled,
}: {
  provider: ProvidersIdEnum | undefined;
  hmacEnabled: boolean;
}) {
  const { environment } = useEnvController();

  const oauthUrlClipboard = useClipboard({ timeout: 1000 });
  const display = provider === ChatProviderIdEnum.Slack;

  const subscriberId = '<SUBSCRIBER_ID>';
  const environmentId = `environmentId=${environment?._id}`;
  const integrationIdentifier = `&integrationIdentifier=<INTEGRATION_IDENTIFIER>`;
  const hmac = hmacEnabled ? '&hmacHash=<HMAC_HASH>' : '';

  const oauthUrl = `${API_ROOT}/v1/subscribers/${subscriberId}/credentials/slack/oauth?${environmentId}${integrationIdentifier}${hmac}`;

  return (
    <When truthy={display}>
      <InputWrapper>
        <Input
          label="Sharable URL"
          value={oauthUrl}
          rightSection={
            <CopyWrapper onClick={() => oauthUrlClipboard.copy(oauthUrl)}>
              {oauthUrlClipboard.copied ? <Check /> : <Copy />}
            </CopyWrapper>
          }
          disabled={true}
          description={'Use the URL below to share your app with any Slack workspace.'}
        />
      </InputWrapper>
    </When>
  );
}
