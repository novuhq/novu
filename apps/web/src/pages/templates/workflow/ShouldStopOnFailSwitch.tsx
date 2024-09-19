import styled from '@emotion/styled/macro';
import { Controller, useFormContext } from 'react-hook-form';
import { Switch } from '@novu/design-system';

import { useEnvironment } from '../../../hooks';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const ShouldStopOnFailSwitch = () => {
  const { control } = useFormContext();
  const { readonly } = useEnvironment();
  const path = useStepFormPath();

  return (
    <Controller
      control={control}
      name={`${path}.shouldStopOnFail`}
      defaultValue={false}
      render={({ field: { value, ...field } }) => {
        return (
          <StyledSwitch
            {...field}
            disabled={readonly}
            checked={value}
            label="Stop if step fails"
            data-test-id="step-should-stop-on-fail-switch"
          />
        );
      }}
    />
  );
};

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
  width: auto;
`;
