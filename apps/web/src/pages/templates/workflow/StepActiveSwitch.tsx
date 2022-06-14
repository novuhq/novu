import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';

export const StepActiveSwitch = ({ control, index }) => {
  const { readonly } = useEnvController();

  return (
    <Controller
      control={control}
      name={`steps.${index}.active`}
      render={({ field: { value, ...field } }) => {
        return (
          <StyledSwitch
            {...field}
            disabled={readonly}
            checked={value}
            label={`Step is ${value ? 'Active' : 'Disabled'}`}
          />
        );
      }}
    />
  );
};

const StyledSwitch = styled(Switch)`
  max-width: 150px !important;
`;
