import { Control, Controller, useWatch } from 'react-hook-form';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { ContentContainer } from './content/ContentContainer';
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
  const enableAvatar = useWatch({
    name: `steps.${index}.template.enableAvatar` as any,
    control,
  });

  return (
    <Controller
      name={`steps.${index}.template.cta.action` as any}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <InAppWidgetPreview {...fieldRefs} readonly={readonly} enableAvatar={!!enableAvatar} index={index}>
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

        return (
          <ContentContainer {...fieldRefs} contentPlaceholder={contentPlaceholder} readonly={readonly} index={index} />
        );
      }}
    />
  );
}
