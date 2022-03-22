import { Control, Controller } from 'react-hook-form';
import { Container, Group } from '@mantine/core';
import React from 'react';
import { IForm } from '../../../legacy/pages/templates/editor/use-template-controller.hook';
import { InAppEditorBlock } from './InAppEditorBlock';
import { Input } from '../../../design-system';
import { LackIntegrationError } from '../LackIntegrationError';

export function TemplateInAppEditor({
  control,
  index,
  isIntegrationActive,
}: {
  control: Control<IForm>;
  index: number;
  errors: any;
  isIntegrationActive: boolean;
}) {
  return (
    <>
      {!isIntegrationActive ? <LackIntegrationError channelType="In-app" /> : null}
      <Container ml={0} sx={{ width: '70%', paddingLeft: '0px' }}>
        <Group grow direction="column">
          <Controller
            name={`inAppMessages.${index}.template.cta.data.url` as any}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value || ''}
                data-test-id="inAppRedirect"
                label="Redirect URL"
                placeholder="i.e /tasks/{{taskId}}"
              />
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
    </>
  );
}
