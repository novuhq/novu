import { useEffect, useState } from 'react';
import { Control, Controller, useFormContext, useWatch } from 'react-hook-form';
import Handlebars from 'handlebars/dist/handlebars';
import { IMessageAction } from '@novu/shared';

import { InAppWidgetPreview } from './preview/InAppWidgetPreview';
import type { IForm } from '../formTypes';
import { EmailCustomCodeEditor } from '../email-editor/EmailCustomCodeEditor';
import { When } from '../../../../components/utils/When';
import { useStepFormPath } from '../../hooks/useStepFormPath';

export function InAppEditorBlock({
  readonly,
  preview = false,
  payload = '{}',
}: {
  readonly: boolean;
  preview?: boolean;
  payload?: string;
}) {
  const { control } = useFormContext();
  const path = useStepFormPath();
  const enableAvatar = useWatch({
    name: `${path}.template.enableAvatar` as any,
    control,
  });

  return (
    <Controller
      name={`${path}.template.cta.action`}
      defaultValue={{} as IMessageAction}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <InAppWidgetPreview {...fieldRefs} preview={preview} readonly={readonly} enableAvatar={!!enableAvatar}>
            <>
              <When truthy={!preview}>
                <ContentContainerController />
              </When>
              <When truthy={preview}>
                <ContentRender payload={payload} />
              </When>
            </>
          </InAppWidgetPreview>
        );
      }}
    />
  );
}

const ContentRender = ({ payload }: { payload: string }) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const content = useWatch({
    name: `${path}.template.content`,
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

function ContentContainerController() {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();

  return (
    <Controller
      name={`${path}.template.content` as any}
      defaultValue=""
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        return <EmailCustomCodeEditor height="100px" onChange={field.onChange} value={field.value} />;
      }}
    />
  );
}
