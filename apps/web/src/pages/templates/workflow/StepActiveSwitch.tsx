import styled from '@emotion/styled';
import { Controller } from 'react-hook-form';
import { Switch } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { useTemplateController } from '../../../components/templates/use-template-controller.hook';
import { useState } from 'react';

export const StepActiveSwitch = ({ control, index, templateId }) => {
  const { readonly } = useEnvController();
  const { watch, setValue } = useTemplateController(templateId);
  const steps = watch('steps');

  const [check, setCheck] = useState(steps[index].active);

  function handleChecked(data: any): void {
    const value = data.currentTarget.checked;
    if (value === check) return;

    steps[index].active = value;

    setCheck(value);
    setValue('steps', steps);
  }

  return (
    <Controller
      control={control}
      name={`steps.${index}.active`}
      render={({ field: { value, ...field } }) => {
        return (
          <StyledSwitch
            {...field}
            disabled={readonly}
            checked={check}
            onChange={handleChecked}
            label={`Step is ${check ? 'active' : 'not active'}`}
          />
        );
      }}
    />
  );
};

const StyledSwitch = styled(Switch)`
  max-width: 100% !important;
`;
