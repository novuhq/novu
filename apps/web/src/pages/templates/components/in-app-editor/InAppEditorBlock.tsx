import { Control, Controller, useWatch } from 'react-hook-form';

import { InAppWidgetPreview } from './preview/InAppWidgetPreview';
import type { IForm } from '../formTypes';
import { useEffect, useState } from 'react';
import { EmailCustomCodeEditor } from '../email-editor/EmailCustomCodeEditor';
import { When } from '../../../../components/utils/When';
import Handlebars from 'handlebars/dist/handlebars';

export function InAppEditorBlock({
  control,
  index,
  readonly,
  preview = false,
  payload = '{}',
}: {
  control: Control<IForm>;
  index: number;
  readonly: boolean;
  preview?: boolean;
  payload?: string;
}) {
  const enableAvatar = useWatch({
    name: `steps.${index}.template.enableAvatar` as any,
    control,
  });

  return (
    <Controller
      name={`steps.${index}.template.cta.action`}
      defaultValue=""
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <InAppWidgetPreview
            {...fieldRefs}
            preview={preview}
            readonly={readonly}
            enableAvatar={!!enableAvatar}
            index={index}
          >
            <>
              <When truthy={!preview}>
                <ContentContainerController control={control} index={index} />
              </When>
              <When truthy={preview}>
                <ContentRender control={control} payload={payload} index={index} />
              </When>
            </>
          </InAppWidgetPreview>
        );
      }}
    />
  );
}

const ContentRender = ({ index, control, payload }) => {
  const content = useWatch({
    name: `steps.${index}.template.content`,
    control,
  });
  const [compiledContent, setCompiledContent] = useState('');

  useEffect(() => {
    try {
      const template = Handlebars.compile(content);
      setCompiledContent(template(JSON.parse(payload)));
    } catch (e) {}
  }, [content, payload]);

  return <span data-test-id="in-app-content-preview" dangerouslySetInnerHTML={{ __html: compiledContent }} />;
};

function ContentContainerController({ control, index }: { control: Control<IForm>; index: number }) {
  return (
    <Controller
      name={`steps.${index}.template.content` as any}
      defaultValue=""
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        return <EmailCustomCodeEditor height="100px" onChange={field.onChange} value={field.value} />;
      }}
    />
  );
}
