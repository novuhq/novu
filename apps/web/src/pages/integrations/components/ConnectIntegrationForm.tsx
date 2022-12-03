import { useEffect, useState, useReducer } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled/macro';
import { useMutation, useQuery } from 'react-query';
import { showNotification } from '@mantine/notifications';
import { useClipboard } from '@mantine/hooks';
import { Image, useMantineColorScheme, Stack, Alert } from '@mantine/core';
import { WarningOutlined } from '@ant-design/icons';
import { ChannelTypeEnum, ICredentialsDto, IConfigCredentials } from '@novu/shared';
import { Button, colors, Input, Switch, Text } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { createIntegration, getWebhookSupportStatus, updateIntegration } from '../../../api/integration';
import { Close } from '../../../design-system/icons/actions/Close';
import { IntegrationInput } from './IntegrationInput';
import { API_ROOT } from '../../../config';
import { useEnvController } from '../../../store/use-env-controller';
import { useAuthController } from '../../../store/use-auth-controller';
import { Check, Copy } from '../../../design-system/icons';

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
  provider: IIntegratedProvider | null;
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
  } = useForm({ shouldUseNativeValidation: false });

  const { colorScheme } = useMantineColorScheme();
  const [isActive, setIsActive] = useState<boolean>(!!provider?.active);
  const { environment } = useEnvController();
  const { organization } = useAuthController();
  const webhookUrlClipboard = useClipboard({ timeout: 1000 });
  const [checkIntegrationState, dispatch] = useReducer(checkIntegrationReducer, checkIntegrationInitialState);

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

  const { mutateAsync: updateIntegrationApi, isLoading: isLoadingUpdate } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
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
  }, [provider]);

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
      if (createModel) {
        await createIntegrationApi({
          providerId: provider?.providerId ? provider?.providerId : '',
          channel: provider?.channel ? provider?.channel : null,
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

  const logoSrc = provider ? `/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}` : '';

  // eslint-disable-next-line max-len
  const webhookUrl = `${API_ROOT}/v1/webhooks/organizations/${organization?._id}/environments/${environment?._id}/${provider?.channel}/${provider?.providerId}`;

  return (
    <Form noValidate onSubmit={handleSubmit(onCreateIntegration)}>
      <CloseButton data-test-id="connection-integration-form-close" type="button" onClick={onClose}>
        <Close />
      </CloseButton>

      <ColumnDiv>
        <Image style={{ maxWidth: 140 }} radius="md" src={logoSrc} alt={`${provider?.providerId} image`} />

        <InlineDiv>
          <span>Read our guide on where to get the credentials </span>
          <a href={provider?.docReference} target="_blank" rel="noreferrer">
            here.
          </a>
        </InlineDiv>
        {provider?.credentials.map((credential: IConfigCredentials) => (
          <InputWrapper key={credential.key}>
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
