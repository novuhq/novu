import { Stack } from '@mantine/core';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';

import { IForm } from '../useTemplateController';
import { Input } from '../../../design-system';
import { useEnvController } from '../../../store/useEnvController';
import { useVariablesManager } from '../../../hooks/useVariablesManager';
import { InAppContentCard } from './InAppContentCard';
import { VariableManagerModal } from '../VariableManagerModal';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const { readonly } = useEnvController();
  const [variableContents, setVariableContents] = useState<string[]>([]);
  const { watch } = useFormContext();
  const variablesArray = useVariablesManager(index, variableContents);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const subscription = watch((values) => {
      const baseContent = ['content'];
      const template = values.steps[index].template;

      if (template.cta?.data?.url) {
        baseContent.push('cta.data.url');
      }

      template.cta?.action?.buttons?.forEach((_button, ind) => {
        baseContent.push(`cta.action.buttons.${ind}.content`);
      });

      if (JSON.stringify(baseContent) !== JSON.stringify(variableContents)) setVariableContents(baseContent);
    });

    return () => subscription.unsubscribe();
  }, [watch]);

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
