import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useMutation } from 'react-query';
import { previewEmail } from '../../../api/content-templates';
import { useIntegrations } from '../../../api/hooks';
import { PreviewMobile } from './PreviewMobile';
import { PreviewWeb } from './PreviewWeb';

export const Preview = ({ activeStep }: { activeStep: number }) => {
  const { watch } = useFormContext();
  const subject = watch(`steps.${activeStep}.template.subject`);
  const contentType = watch(`steps.${activeStep}.template.contentType`);
  const htmlContent = watch(`steps.${activeStep}.template.htmlContent`);
  const editorContent = watch(`steps.${activeStep}.template.content`);
  const { integrations = [] } = useIntegrations();
  const [integration, setIntegration]: any = useState(null);
  const [content, setContent] = useState<string | undefined>(undefined);
  const { isLoading, mutateAsync } = useMutation(previewEmail);

  useEffect(() => {
    if (contentType !== 'editor') {
      setContent(htmlContent);

      return;
    }
    mutateAsync({
      content: editorContent,
      contentType,
    }).then((result: { html: string }) => {
      setContent(result.html);

      return result;
    });
  }, [contentType, htmlContent, editorContent, setContent]);

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(integrations.find((item) => item.channel === 'email') || null);
  }, [integrations, setIntegration]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <PreviewWeb subject={subject} content={content} integration={integration} />
      <PreviewMobile subject={subject} content={content} integration={integration} />
    </>
  );
};
