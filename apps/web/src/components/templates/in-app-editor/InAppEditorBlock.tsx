import { Control, Controller, useWatch } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { InAppWidgetPreview } from '../../widget/InAppWidgetPreview';
import { IForm } from '../useTemplateController';
import { EmailCustomCodeEditor } from '../email-editor/EmailCustomCodeEditor';
import { When } from '../../utils/When';
// To not make webpack complain about usage of fs, common.js seems to solve this.
const Handlebars = require('handlebars');

export function InAppEditorBlock({
  control,
  index,
  readonly,
  preview = false,
}: {
  control: Control<IForm>;
  index: number;
  readonly: boolean;
  preview?: boolean;
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
                <ContentRender control={control} index={index} />
              </When>
            </>
          </InAppWidgetPreview>
        );
      }}
    />
  );
}

const ContentRender = ({ index, control }) => {
  const content = useWatch({
    name: `steps.${index}.template.content`,
    control,
  });
  const [compiledContent, setCompiledContent] = useState('');

  useEffect(() => {
    const template = Handlebars.compile(content);
    setCompiledContent(template({}));
  }, [content]);

  return <>{compiledContent}</>;
};

function ContentContainerController({ control, index }: { control: Control<IForm>; index: number }) {
  return (
    <Controller
      name={`steps.${index}.template.content` as any}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        return <EmailCustomCodeEditor height="100px" onChange={field.onChange} value={field.value} />;
      }}
    />
  );
}
