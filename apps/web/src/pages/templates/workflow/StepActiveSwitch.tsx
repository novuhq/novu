import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch } from '../../../design-system';
import { useEnvController } from '../../../hooks';

export const StepActiveSwitch = ({ control, index, path = '' }) => {
  const { readonly } = useEnvController();

  return (
    <Controller
      control={control}
      name={`${path ? path : `steps.${index}`}.active`}
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
