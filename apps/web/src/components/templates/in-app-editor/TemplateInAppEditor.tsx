import { Control, Controller, useFormContext } from 'react-hook-form';
import { Container, Group } from '@mantine/core';
import { IForm } from '../../../legacy/pages/templates/editor/use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Input } from '../../../design-system';

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  return (
    <Container ml={0} sx={{ width: '70%', paddingLeft: '0px' }}>
      <Group grow direction="column">
        <Controller
          name={`inAppMessages.${index}.template.cta.data.url` as any}
          control={control}
          data-test-id="inAppRedirect"
          render={({ field }) => (
            <Input {...field} value={field.value || ''} label="Redirect URL" placeholder="i.e /tasks/{{taskId}}" />
          )}
        />
        <Controller
          name={`inAppMessages.${index}.template.content` as any}
          data-test-id="in-app-content-form-item"
          control={control}
          render={({ field }) => {
            const { ref, ...fieldRefs } = field;

            return <InAppEditorBlock {...fieldRefs} contentPlaceholder="Notification content goes here..." />;
          }}
        />
      </Group>
    </Container>
  );
}
