import { Control, Controller } from 'react-hook-form';
import { Container, Group } from '@mantine/core';
import React from 'react';
import { IForm } from '../use-template-controller.hook';
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
      <Container ml={0} sx={{ maxWidth: '400px', paddingLeft: '0px' }}>
        <Group grow direction="column">
          <Controller
            name={`inAppMessages.${index}.template.cta.data.url` as any}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value || ''}
                description="The URL that will be opened when the user clicks the CTA button."
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

              return <InAppEditorBlock {...fieldRefs} contentPlaceholder="Write your notification content here..." />;
            }}
          />
        </Group>
      </Container>
    </>
  );
}
