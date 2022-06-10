import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch } from '../../../design-system';

export const StepActiveSwitch = ({ control, index }) => {
  return (
    <Controller
      control={control}
      name={`steps.${index}.active`}
      render={({ field }) => <StyledSwitch {...field} label={'Step is Active'} />}
    />
  );
};

const StyledSwitch = styled(Switch)`
  max-width: 150px !important;
`;
