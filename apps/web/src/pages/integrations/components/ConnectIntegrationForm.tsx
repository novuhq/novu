import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { ChannelTypeEnum, ICredentialsDto, IConfigCredentials } from '@novu/shared';
import { useMutation } from 'react-query';
import { showNotification } from '@mantine/notifications';
import { Image, useMantineColorScheme, Stack } from '@mantine/core';
import { Button, colors, Switch, Text } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { createIntegration, updateIntegration } from '../../../api/integration';
import { Close } from '../../../design-system/icons/actions/Close';
import { IntegrationInput } from './IntegrationInput';

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
  const [isCheckIntegration, setIsCheckIntegration] = useState<boolean>(true);

  const { mutateAsync: createIntegrationApi } = useMutation<
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

  const { mutateAsync: updateIntegrationApi } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    {
      integrationId: string;
      data: { credentials: ICredentialsDto; active: boolean };
    }
  >(({ integrationId, data }) => updateIntegration(integrationId, data));

  useEffect(() => {
    if (provider?.credentials) {
      for (const credential of provider.credentials) {
        setValue(credential.key, credential.value);
      }
    }
  }, [provider]);

  async function onCreatIntegration(credentials: ICredentialsDto) {
    try {
      if (createModel) {
        await createIntegrationApi({
          providerId: provider?.providerId ? provider?.providerId : '',
          channel: provider?.channel ? provider?.channel : null,
          credentials,
          active: isActive,
          check: isCheckIntegration,
        });
      } else {
        await updateIntegrationApi({
          integrationId: provider?.integrationId ? provider?.integrationId : '',
          data: { credentials, active: isActive },
        });
      }
    } catch (e: any) {
      showNotification({
        message: `Exception occurred while fetching integration: ${e?.messages.toString()}`,
        color: 'red',
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
    setIsCheckIntegration((prev) => !prev);
  }

  const logoSrc = provider ? `/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}` : '';

  return (
    <Form onSubmit={handleSubmit(onCreatIntegration)}>
      <CloseButton onClick={onClose}>
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
        <Stack my={30}>
          <ActiveWrapper active={isActive}>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={isActive} data-test-id="is_active_id" {...field} onChange={handlerSwitchChange} />
              )}
            />
            <StyledText>{isActive ? 'Active' : 'Disabled'}</StyledText>
          </ActiveWrapper>
          {createModel && provider?.channel === ChannelTypeEnum.EMAIL && (
            <CheckIntegrationWrapper>
              <Controller
                control={control}
                name="check"
                render={({ field }) => (
                  <Switch
                    checked={isCheckIntegration}
                    data-test-id="is_check_integration_id"
                    {...field}
                    onChange={handlerCheckIntegrationChange}
                  />
                )}
              />
              <StyledText>Send a test email to verify the credentials?</StyledText>
            </CheckIntegrationWrapper>
          )}
        </Stack>

        <Button submit fullWidth>
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
  & > :first-child {
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
