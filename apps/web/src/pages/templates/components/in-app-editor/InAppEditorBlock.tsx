import { useEffect, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { IMessageAction, MessageActionStatusEnum } from '@novu/shared';
import { InAppWidgetPreview } from './preview/InAppWidgetPreview';
import type { IForm } from '../formTypes';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { colors, errorMessage } from '@novu/design-system';
import { useMutation } from '@tanstack/react-query';
import { previewInApp } from '../../../../api/content-templates';
import { Center, Loader } from '@mantine/core';
import { CustomCodeEditor } from '../CustomCodeEditor';

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

  if (preview) {
    return <ContentRender readonly={readonly} payload={payload} />;
  }

  return (
    <Controller
      name={`${path}.template.cta.action`}
      defaultValue={{} as IMessageAction}
      data-test-id="in-app-content-form-item"
      control={control}
      render={({ field }) => {
        const { ref, ...fieldRefs } = field;

        return (
          <InAppWidgetPreview {...fieldRefs} readonly={readonly} enableAvatar={!!enableAvatar}>
            <ContentContainerController />
          </InAppWidgetPreview>
        );
      }}
    />
  );
}

const ContentRender = ({ payload, readonly }: { payload: string; readonly: boolean }) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const content = useWatch({
    name: `${path}.template.content`,
    control,
  });
  const cta = useWatch({
    name: `${path}.template.cta`,
    control,
  });
  const enableAvatar = useWatch({
    name: `${path}.template.enableAvatar` as any,
    control,
  });

  const [buttons, setButtons] = useState<any[]>([]);
  const { isLoading, mutateAsync } = useMutation(previewInApp);
  const [compiledContent, setCompiledContent] = useState('');

  const parseContent = (args: { content?: string | any; payload: any; cta: any }) => {
    mutateAsync({
      ...args,
      payload: JSON.parse(args.payload),
    })
      .then((result: { content: string; ctaButtons: any[] }) => {
        setCompiledContent(result.content);
        setButtons(result.ctaButtons);

        return result;
      })
      .catch((e: any) => {
        errorMessage(e?.message || 'Un-expected error occurred');
      });
  };

  useEffect(() => {
    parseContent({
      content,
      payload,
      cta,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiledContent, payload, cta]);

  if (isLoading) {
    return (
      <div>
        <Center>
          <Loader color={colors.B70} mb={20} mt={20} size={32} />
        </Center>
      </div>
    );
  }

  return (
    <InAppWidgetPreview
      preview={true}
      readonly={readonly}
      enableAvatar={!!enableAvatar}
      value={{
        status: MessageActionStatusEnum.PENDING,
        buttons: buttons,
        result: {},
      }}
      onChange={() => {}}
    >
      <span data-test-id="in-app-content-preview" dangerouslySetInnerHTML={{ __html: compiledContent }} />
    </InAppWidgetPreview>
  );
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
        return <CustomCodeEditor height="100%" onChange={field.onChange} value={field.value} />;
      }}
    />
  );
}
