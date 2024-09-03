import { Controller, useFormContext } from 'react-hook-form';
import { useState } from 'react';
import { Grid, Stack } from '@mantine/core';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { ControlVariablesForm } from '../ControlVariablesForm';

export function TemplateCustomEditor() {
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext();

  const [controlVariables, setControlVariables] = useState();

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
                <ControlVariablesForm
                  onChange={(values) => {
                    setControlVariables(values);
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
