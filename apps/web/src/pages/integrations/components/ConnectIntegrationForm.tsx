import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { ChannelTypeEnum, ICredentialsDto } from '@notifire/shared';
import { useMutation } from 'react-query';
import { message } from 'antd';
import { PasswordInput } from '@mantine/core';
import { Button, colors, Switch, Text } from '../../../design-system';
import { Check } from '../../../design-system/icons';
import { IIntegratedProvider } from '../IntegrationsStorePage';
import { createIntegration, updateIntegration } from '../../../api/integration';

export function ConnectIntegrationForm({
  provider,
  showModal,
  createModel,
}: {
  provider: IIntegratedProvider | null;
  showModal: (visible: boolean) => void;
  createModel: boolean;
}) {
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
      message.warn(`Exception occured while fetching integration: ${e?.messages.toString()}`);
    }

    message.success(`Successfully ${createModel ? 'added' : 'updated'} integration`);

    showModal(false);
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm({ shouldUseNativeValidation: false });

  function handlerSwitchChange() {
    setIsActive((prev) => !prev);
  }

  return (
    <form onSubmit={handleSubmit(onCreatIntegration)}>
      <ColumnDiv>
        <InlineDiv>
          <span>Read our guide on where to get the credentials </span>
          <a href={provider?.docReference}>here</a>
        </InlineDiv>
        {provider?.credentials.map((credential) => (
          <Controller
            key={credential.key}
            name={credential.key}
            control={control}
            render={({ field }) => (
              <PasswordInput
                label={credential.displayName}
                defaultValue={credential.value ? credential.value : ''}
                required
                data-test-id={credential.key}
                {...field}
                error={errors[credential.key]?.message}
                {...register(credential.key, { required: `Please enter a ${credential.displayName.toLowerCase()}` })}
              />
            )}
          />
        ))}
        <RowDiv>
          <ActiveWrapper>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={isActive} data-test-id="is_active_id" {...field} onChange={handlerSwitchChange} />
              )}
            />
            <StyledText>Active</StyledText>
          </ActiveWrapper>
          <ConnectedWrapper>
            <StyledText>Connected</StyledText>
            <Check />
          </ConnectedWrapper>
        </RowDiv>
        <Button submit fullWidth>
          {createModel ? 'Connect' : 'Update'}
        </Button>
      </ColumnDiv>
    </form>
  );
}

const StyledText = styled(Text)`
  display: inline-block;
  word-break: normal;
  margin: 0 6px;
`;

const SideElementBase = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const ActiveWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: red;
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

  span {
    margin-right: 5px;
  }
`;

const ConnectedWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: ${colors.success};
  }
`;
