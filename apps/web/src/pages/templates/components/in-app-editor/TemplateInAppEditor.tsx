import { Stack } from '@mantine/core';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { useState, useMemo } from 'react';

import type { IForm, ITemplates } from '../formTypes';
import { Input } from '../../../../design-system';
import { useEnvController, useVariablesManager } from '../../../../hooks';
import { InAppContentCard } from './InAppContentCard';
import { VariableManagerModal } from '../VariableManagerModal';

const getVariableContents = (template: ITemplates) => {
  const baseContent = ['content'];

  if (template.cta?.data?.url) {
    baseContent.push('cta.data.url');
  }

  template.cta?.action?.buttons?.forEach((_button, ind) => {
    baseContent.push(`cta.action.buttons.${ind}.content`);
  });

  return baseContent;
};

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const { readonly } = useEnvController();
  const { watch } = useFormContext<IForm>();
  const [modalOpen, setModalOpen] = useState(false);

  const template = watch(`steps.${index}.template`);
  const variableContents = getVariableContents(template);

  const variablesArray = useVariablesManager(index, variableContents);

  return (
    <>
      <div
        style={{
          margin: '0 25px 0 25px',
        }}
      >
        <Stack spacing={25}>
          <Controller
            name={`steps.${index}.template.cta.data.url` as any}
            defaultValue=""
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                error={fieldState.error?.message}
                value={field.value || ''}
                disabled={readonly}
                description="The URL that will be opened when user clicks the notification"
                data-test-id="inAppRedirect"
                label="Redirect URL"
                placeholder="i.e /tasks/{{taskId}}"
              />
            )}
          />
          <InAppContentCard
            index={index}
            openVariablesModal={() => {
              setModalOpen(true);
            }}
          />
        </Stack>
      </div>
      <VariableManagerModal open={modalOpen} setOpen={setModalOpen} index={index} variablesArray={variablesArray} />
    </>
  );
}
