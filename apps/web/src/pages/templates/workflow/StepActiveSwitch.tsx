import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch } from '../../../design-system';

export const StepActiveSwitch = ({ control, index }) => (
  <Controller
    control={control}
    name={`steps.${index}.active`}
    render={({ field: { value, ...field } }) => {
      return <StyledSwitch {...field} checked={value} label={`Step is ${value ? 'Active' : 'Disabled'}`} />;
    }}
  />
);

const StyledSwitch = styled(Switch)`
  max-width: 150px !important;
`;
