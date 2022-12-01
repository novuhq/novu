import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';

export const ShouldStopOnFailSwitch = ({ control, index }) => {
  const { readonly } = useEnvController();

  return (
    <Controller
      control={control}
      name={`steps.${index}.shouldStopOnFail`}
      render={({ field: { value, ...field } }) => {
        return (
          <StyledSwitch
            {...field}
            disabled={readonly}
            checked={value}
            label="Stop workflow if this step fails?"
            data-test-id="step-should-stop-on-fail-switch"
          />
        );
      }}
    />
  );
};

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
`;
