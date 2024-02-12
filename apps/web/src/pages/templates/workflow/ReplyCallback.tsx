import styled from '@emotion/styled';
import { Controller, useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Grid } from '@mantine/core';
import { Input, Switch, Text, CircleArrowRight } from '@novu/design-system';

import { useEnvController } from '../../../hooks';
import { When } from '../../../components/utils/When';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const ReplyCallback = () => {
  const path = useStepFormPath();
  const { environment } = useEnvController();
  const { watch } = useFormContext();
  const replyCallbackActive = watch(`${path}.replyCallback.active`);

  const domainMxRecordConfigured =
    environment?.dns?.inboundParseDomain && environment?.dns?.mxRecordConfigured === true;

  return (
    <>
      <When truthy={!domainMxRecordConfigured && replyCallbackActive}>
        <LackConfigurationError
          text={
            'Looks like you haven’t configured your domain mx record or ' +
            'added your domain to the allowed domain list under email settings yet.'
          }
          redirectTo={'/settings'}
        />
      </When>
      <ReplyCallbackUrlInput />
    </>
  );
};

export const ReplyCallbackUrlInput = () => {
  const { control } = useFormContext();
  const path = useStepFormPath();
  const { readonly } = useEnvController();
  const { watch } = useFormContext();
  const replyCallbackActive = watch(`${path}.replyCallback.active`);

  return (
    <When truthy={replyCallbackActive}>
      <Controller
        control={control}
        name={`${path}.replyCallback.url`}
        defaultValue=""
        render={({ field: { value, ...field } }) => {
          return (
            <Input
              mb={24}
              mt={24}
              {...field}
              data-test-id="reply-callback-url-input"
              disabled={readonly}
              type={'url'}
              required={!!replyCallbackActive}
              value={value || ''}
              label="Replay callback URL"
              placeholder="e.g. www.user-domain.com/reply"
            />
          );
        }}
      />
    </When>
  );
};

export const ReplyCallbackSwitch = () => {
  const { control } = useFormContext();
  const { readonly } = useEnvController();
  const path = useStepFormPath();

  return (
    <>
      <Controller
        control={control}
        name={`${path}.replyCallback.active`}
        defaultValue={false}
        render={({ field: { value, ...field } }) => {
          return (
            <StyledSwitch
              {...field}
              disabled={readonly}
              checked={value}
              label="Enable reply callbacks"
              data-test-id="step-replay-callbacks-switch"
            />
          );
        }}
      />
    </>
  );
};

export function LackConfigurationError({ text, redirectTo }: { text: string; redirectTo: string }) {
  const navigate = useNavigate();

  return (
    <>
      <Grid align={'center'} mt={24}>
        <WarningMessage>
          <Grid.Col p={0} span={11}>
            <Text>{text}</Text>
          </Grid.Col>
          <Grid.Col p={0} span={'content'}>
            <CircleArrowRight onClick={() => navigate(redirectTo)} />
          </Grid.Col>
        </WarningMessage>
      </Grid>
    </>
  );
}

const WarningMessage = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  color: #e54545;
  background: rgba(230, 69, 69, 0.15);
  border-radius: 7px;
  width: 100%;
`;

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  width: auto;
`;
