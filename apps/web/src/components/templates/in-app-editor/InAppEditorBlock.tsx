import React from 'react';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { ContentContainer } from './ContentContainer';
import { Control, Controller } from 'react-hook-form';
import { IForm } from '../use-template-controller.hook';

export function InAppEditorBlock({
  contentPlaceholder,
  control,
  index,
  readonly,
}: {
  contentPlaceholder: string;
  control: Control<IForm>;
  index: number;
  readonly: boolean;
}) {
  return (
    <Controller
      name={`steps.${index}.template.cta.action` as any}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <InAppWidgetPreview {...fieldRefs} readonly={readonly}>
            <ContentContainerController
              control={control}
              index={index}
              contentPlaceholder={contentPlaceholder}
              readonly={readonly}
            />
          </InAppWidgetPreview>
        );
      }}
    />
  );
}

function ContentContainerController({
  contentPlaceholder,
  control,
  index,
  readonly,
}: {
  contentPlaceholder: string;
  control: Control<IForm>;
  index: number;
  readonly: boolean;
}) {
  return (
    <Controller
      name={`steps.${index}.template.content` as any}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return <ContentContainer {...fieldRefs} contentPlaceholder={contentPlaceholder} readonly={readonly} />;
      }}
    />
  );
}
