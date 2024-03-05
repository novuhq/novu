import { useEffect, useState, useReducer } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import styled from '@emotion/styled/macro';
import { useMutation, useQuery } from '@tanstack/react-query';
import { showNotification } from '@mantine/notifications';
import { useClipboard } from '@mantine/hooks';
import { Image, useMantineColorScheme, Stack, Alert } from '@mantine/core';
import { WarningOutlined } from '@ant-design/icons';
import { ChannelTypeEnum, CredentialsKeyEnum } from '@novu/shared';
import type { IResponseError, ICredentialsDto, IConfigCredentials, ICreateIntegrationBodyDto } from '@novu/shared';

import { Button, colors, Input, Switch, Text, Close, Check, Copy } from '@novu/design-system';
import type { IIntegratedProvider } from '../types';
import { createIntegration, getWebhookSupportStatus, updateIntegration } from '../../../api/integration';
import { IntegrationInput } from './IntegrationInput';
import { IS_DOCKER_HOSTED, WEBHOOK_URL } from '../../../config';
import { useEnvController, useAuthController } from '../../../hooks';
import { CONTEXT_PATH } from '../../../config';
import { ShareableUrl } from './Modal/ConnectIntegrationForm';

enum ACTION_TYPE_ENUM {
  HANDLE_SHOW_SWITCH = 'handle_show_switch',
  HANDLE_ALERT_AND_ERROR_MSG = 'handle_alert_and_error_msg',
  TOGGLE_CHECK = 'toggle_check',
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
    };

const checkIntegrationInitialState = {
  check: true,
  isShowSwitch: false,
  isShowAlert: false,
  errorMsg: '',
};

const checkIntegrationReducer = (state: typeof checkIntegrationInitialState, action: ActionType) => {
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

    default:
      return state;
  }
};

export function ConnectIntegrationForm({
  provider,
  showModal,
  createModel,
  onClose,
}: {
  provider: IIntegratedProvider;
  showModal: (visible: boolean) => void;
  createModel: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    control,
    watch,
  } = useForm({ shouldUseNativeValidation: false });

  const { colorScheme } = useMantineColorScheme();
  const [isActive, setIsActive] = useState<boolean>(!!provider?.active);
  const { environment } = useEnvController();
  const { organization } = useAuthController();
  const webhookUrlClipboard = useClipboard({ timeout: 1000 });
  const [checkIntegrationState, dispatch] = useReducer(checkIntegrationReducer, checkIntegrationInitialState);

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
  }, [setValue, provider]);

  async function onCreateIntegration(credentials: ICredentialsDto) {
    try {
      if (checkIntegrationState.isShowAlert) {
        dispatch({
          type: ACTION_TYPE_ENUM.HANDLE_ALERT_AND_ERROR_MSG,
          payload: {
            isShowAlert: false,
            errorMsg: '',
          },
        });
      }
      if (credentials.tlsOptions) {
        try {
          credentials.tlsOptions = JSON.parse(String(credentials.tlsOptions));
        } catch (err) {
          throw new Error('Invalid JSON format for TLS Options');
        }
      } else {
        credentials.tlsOptions = undefined;
        if (createModel) {
          await createIntegrationApi({
            providerId: provider?.providerId ? provider?.providerId : '',
            channel: provider?.channel,
            credentials,
            active: isActive,
            check: checkIntegrationState.check,
          });
        } else {
          await updateIntegrationApi({
            integrationId: provider?.integrationId ? provider?.integrationId : '',
            data: { credentials, active: isActive, check: checkIntegrationState.check },
          });
        }
      }
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

      return;
    }

    showNotification({
      message: `Successfully ${createModel ? 'added' : 'updated'} integration`,
      color: 'green',
    });

    showModal(false);
  }

  function handlerSwitchChange() {
    setIsActive((prev) => !prev);
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
  const webhookUrl = `${WEBHOOK_URL}/webhooks/organizations/${organization?._id}/environments/${environment?._id}/${provider?.channel}/${provider?.providerId}`;

  const isWebhookEnabled =
    !IS_DOCKER_HOSTED &&
    webhookSupportStatus &&
    provider?.channel &&
    [ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(provider?.channel);

  return (
    <Form noValidate onSubmit={handleSubmit(onCreateIntegration)}>
      <CloseButton data-test-id="connection-integration-form-close" type="button" onClick={onClose}>
        <Close />
      </CloseButton>
      <Image style={{ maxWidth: 140 }} radius="md" src={logoSrc} alt={`${provider?.providerId} image`} />

      <ColumnDiv>
        <CenterDiv>
          <InlineDiv>
            <span>
              Take a look at{' '}
              <a href={provider?.docReference} target="_blank" rel="noreferrer" style={{ color: '#DD2476 ' }}>
                our guide
              </a>{' '}
              for how to connect <strong>{provider?.displayName}</strong>.
            </span>
          </InlineDiv>
          {provider?.credentials.map((credential: IConfigCredentials) => (
            <InputWrapper key={credential.key}>
              <Controller
                name={credential.key}
                control={control}
                render={({ field }) => (
                  <IntegrationInput
                    credential={credential}
                    ignoreTls={watch('ignoreTls')}
                    errors={errors}
                    field={field}
                    register={register}
                  />
                )}
              />
            </InputWrapper>
          ))}
          {isWebhookEnabled && (
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

          <Stack my={30}>
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
            {provider?.channel === ChannelTypeEnum.EMAIL && checkIntegrationState.isShowSwitch && (
              <CheckIntegrationWrapper>
                <Controller
                  control={control}
                  name="check"
                  render={({ field }) => (
                    <Switch
                      checked={checkIntegrationState.check}
                      data-test-id="is_check_integration_id"
                      {...field}
                      onChange={handlerCheckIntegrationChange}
                    />
                  )}
                />
                <StyledText>Verify provider credentials</StyledText>
              </CheckIntegrationWrapper>
            )}

            {checkIntegrationState.isShowAlert && (
              <Alert icon={<WarningOutlined size={16} />} title="An error occurred!" color="red" mb={30}>
                {checkIntegrationState.errorMsg}
              </Alert>
            )}
          </Stack>
        </CenterDiv>
        <Button submit fullWidth loading={isLoadingUpdate || isLoadingCreate}>
          {createModel ? 'Connect' : 'Update'}
        </Button>
      </ColumnDiv>
    </Form>
  );
}

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

const ColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
`;

const InlineDiv = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 30px;
  margin-top: 30px;

  span {
    margin-right: 5px;
  }
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

const InputWrapper = styled.div`
  margin-bottom: 30px;
  label {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
  }
`;

const Form = styled.form`
  position: relative;
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
  margin-top: 10px;
  margin-bottom: 10px;
  padding-right: 30px;
`;
