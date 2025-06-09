import { useFormContext, useWatch } from 'react-hook-form';
import { FormField } from '@/components/primitives/form/form';
import { Maily } from './maily';
import { HtmlEditor } from './html-editor';
import { isMailyJson } from './maily-utils';

export const EmailBody = () => {
  const { control } = useFormContext();
  const editorType = useWatch({ name: 'editorType', control });

  return (
    <FormField
      control={control}
      name="body"
      render={({ field }) => {
        // when switching to html/block editor, we still might have locally maily json or html content
        // so we need will show the empty string until we receive the updated value from the server
        const isMaily = isMailyJson(field.value);

        if (editorType === 'html') {
          return <HtmlEditor value={isMaily ? '' : field.value} onChange={field.onChange} />;
        }

        return <Maily value={isMaily ? field.value : ''} onChange={field.onChange} />;
      }}
    />
  );
};
