import { ChannelTypeEnum, LAYOUT_CONTENT_VARIABLE, UiComponentEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { EmailEditorSelect } from '@/components/email-editor-select';
import { formatHtml } from '@/utils/formatter';
import { useLayoutEditor } from './layout-editor-provider';
import { LayoutEmailBody } from './layout-email-body';

const EmailEditorSelectInternal = () => {
  const { setValue } = useFormContext();
  const { previewData } = useLayoutEditor();

  const previewBody = useMemo(() => {
    if (!previewData?.result || previewData.result.type !== ChannelTypeEnum.EMAIL) {
      return '';
    }

    return previewData.result.preview?.body || '';
  }, [previewData?.result]);

  return (
    <EmailEditorSelect
      isLoading={false}
      saveForm={async ({ editorType, onSuccess }) => {
        if (editorType === 'html') {
          const cleanedBody = previewBody
            .replace(
              /<table[^>]*data-content-placeholder[^>]*>[\s\S]*?<\/table>(\s*)/gi,
              `{{ ${LAYOUT_CONTENT_VARIABLE} }}`
            )
            .replace(/<table[^>]*data-novu-branding[^>]*>[\s\S]*?<\/table>(\s*)/gi, '');
          const formattedValue = await formatHtml(cleanedBody);
          setValue('body', formattedValue);
        } else {
          setValue('body', '{"type":"doc","content":[]}');
        }

        onSuccess?.();
      }}
    />
  );
};

export const getLayoutComponentByType = ({ component }: { component?: UiComponentEnum }) => {
  switch (component) {
    case UiComponentEnum.EMAIL_EDITOR_SELECT: {
      return <EmailEditorSelectInternal />;
    }

    case UiComponentEnum.EMAIL_BODY:
      return <LayoutEmailBody />;

    default: {
      return null;
    }
  }
};
