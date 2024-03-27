import styled from '@emotion/styled';
import { Controller, useFormContext } from 'react-hook-form';
import { Switch } from '@novu/design-system';

import { useEnvController } from '../../../hooks';
import { useStepFormPath } from '../hooks/useStepFormPath';

export const StepActiveSwitch = () => {
  const { control } = useFormContext();
  const { readonly } = useEnvController();
  const path = useStepFormPath();

  return (
    <Controller
      control={control}
      name={`${path}.active`}
      defaultValue={true}
      render={({ field: { value, ...field } }) => {
        return (
          <StyledSwitch
            {...field}
            disabled={readonly}
            checked={value}
            label={value ? 'Active' : 'Inactive'}
            data-test-id="step-active-switch"
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
