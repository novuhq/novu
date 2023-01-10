import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Input, Switch } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';

export const ReplyCallback = ({ control, index, errors }) => {
  const { readonly } = useEnvController();

  return (
    <>
      <ReplyCallbackSwitch index={index} control={control} />
      <Controller
        control={control}
        name={`steps.${index}.replyCallback.url`}
        render={({ field: { value, ...field } }) => {
          return (
            <Input
              {...field}
              mb={30}
              data-test-id="reply-callback-url-input"
              disabled={readonly}
              type={'url'}
              // required={!!value?.checked}
              value={value || ''}
              label="Replay callback URL"
              placeholder="www.user-domain.com/reply"
            />
          );
        }}
      />
    </>
  );
};

export const ReplyCallbackSwitch = ({ control, index }) => {
  const { readonly } = useEnvController();

  return (
    <Controller
      control={control}
      name={`steps.${index}.replyCallback.active`}
      render={({ field: { value, ...field } }) => {
        return (
          <StyledSwitch
            {...field}
            disabled={readonly}
            checked={value ?? false}
            label="Enable reply callbacks"
            data-test-id="step-replay-callbacks-switch"
          />
        );
      }}
    />
  );
};

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
`;
