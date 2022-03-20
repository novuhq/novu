import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { ChannelTypeEnum, ICredentialsDto } from '@notifire/shared';
import { useMutation } from 'react-query';
import { message } from 'antd';
import { Button, colors, Input, Switch, Text } from '../../../design-system';
import { Check } from '../../../design-system/icons';
import { api } from '../../../api/api.client';
import { IIntegratedProvider } from '../IntegrationsStorePage';

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
  >((data) => api.post(`/v1/integrations`, data));

  const { mutateAsync: updateIntegrationApi } = useMutation<
    { res: string },
    { error: string; message: string; statusCode: number },
    {
      integrationId: string;
      data: any;
    }
  >(({ data, integrationId }) => api.put(`/v1/integrations/${integrationId}`, data));

  async function onCreatIntegration(credentials) {
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
          <span style={{ marginRight: 5 }}>Read our guide on where to get the credentials </span>
          <a href={provider?.docReference}>here</a>
        </InlineDiv>
        {provider?.credentials.map((credential) => (
          <Controller
            key={credential.key}
            name={credential.key}
            control={control}
            render={({ field }) => (
              <Input
                label={credential.value}
                required
                data-test-id={credential.key}
                {...field}
                error={errors[credential.key]?.message}
                {...register(credential.key, { required: `Please enter a ${credential.value.toLowerCase()}` })}
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
`;

const ConnectedWrapper = styled(SideElementBase)`
  ${StyledText} {
    color: ${colors.success};
  }
`;
