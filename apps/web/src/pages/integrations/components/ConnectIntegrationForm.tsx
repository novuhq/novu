import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { ChannelTypeEnum, ICredentialsDto } from '@notifire/shared';
import { useMutation } from 'react-query';
import { showNotification } from '@mantine/notifications';
import { Image, useMantineColorScheme } from '@mantine/core';
import { Button, colors, PasswordInput, Switch, Text } from '../../../design-system';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { createIntegration, updateIntegration } from '../../../api/integration';
import { Close } from '../../../design-system/icons/actions/Close';

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

  const { mutateAsync: createIntegrationApi } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    { providerId: string; channel: ChannelTypeEnum | null; credentials: ICredentialsDto; active: boolean }
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

  const isDark = colorScheme === 'dark';
  const logoSrc = provider ? `/static/images/providers/${isDark ? 'dark' : 'light'}/${provider.providerId}.png` : '';

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
        {provider?.credentials.map((credential) => (
          <InputWrapper key={credential.key}>
            <Controller
              name={credential.key}
              control={control}
              render={({ field }) => (
                <PasswordInput
                  label={credential.displayName}
                  required
                  placeholder={credential.displayName}
                  data-test-id={credential.key}
                  error={errors[credential.key]?.message}
                  {...field}
                  {...register(credential.key, { required: `Please enter a ${credential.displayName.toLowerCase()}` })}
                />
              )}
            />
          </InputWrapper>
        ))}
        <RowDiv>
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
        </RowDiv>
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

const RowDiv = styled.div`
  justify-content: space-between;
  display: flex;
  flex-direction: row;
  margin: 30px 0 30px 0;
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

const ConnectedWrapper = styled(SideElementBase)`
  display: flex;
  justify-content: center;
  align-items: center;

  ${StyledText}, svg {
    color: ${colors.success};
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
