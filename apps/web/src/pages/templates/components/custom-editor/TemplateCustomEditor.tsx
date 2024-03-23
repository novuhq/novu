import { Controller, useFormContext } from 'react-hook-form';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { useState } from 'react';
import { Grid, Stack } from '@mantine/core';
import { InputVariablesForm } from '../InputVariablesForm';

export function TemplateCustomEditor() {
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext();

  const [inputVariables, setInputVariables] = useState();

  return (
    <>
      <StepSettings />
      <Grid gutter={24}>
        <Grid.Col span={'auto'}>
          <Controller
            name={`${stepFormPath}.template.content` as any}
            defaultValue=""
            control={control}
            render={({ field }) => (
              <Stack spacing={8}>
                <InputVariablesForm
                  onChange={(values) => {
                    setInputVariables(values);
                  }}
                />
              </Stack>
            )}
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
