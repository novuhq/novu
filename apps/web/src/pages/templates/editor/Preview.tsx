import { Grid, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useMutation } from 'react-query';
import { previewEmail } from '../../../api/content-templates';
import { useIntegrations } from '../../../api/hooks';
import { EmailInboxContent } from '../../../components/templates/email-editor/EmailInboxContent';
import { PreviewMobile } from './PreviewMobile';
import { PreviewMobileInbox } from './PreviewMobileInbox';
import { PreviewWeb } from './PreviewWeb';

export const Preview = ({ activeStep }: { activeStep: number }) => {
  const { watch } = useFormContext();
  const subject = watch(`steps.${activeStep}.template.subject`);
  const contentType = watch(`steps.${activeStep}.template.contentType`);
  const htmlContent = watch(`steps.${activeStep}.template.htmlContent`);
  const editorContent = watch(`steps.${activeStep}.template.content`);
  const preheader = watch(`steps.${activeStep}.template.preheader`);
  const { integrations = [] } = useIntegrations();
  const [integration, setIntegration]: any = useState(null);
  const [content, setContent] = useState<string>('<html><head></head><body><div></div></body></html>');
  const { isLoading, mutateAsync } = useMutation(previewEmail);

  useEffect(() => {
    if (contentType !== 'editor') {
      if (!htmlContent) {
        return;
      }
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
  }, [contentType, htmlContent, editorContent, setContent, mutateAsync]);

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(integrations.find((item) => item.channel === 'email') || null);
  }, [integrations, setIntegration]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div style={{ marginLeft: '30px', marginRight: '30px', marginTop: '68px' }}>
        <EmailInboxContent index={activeStep} integration={integration} readonly={true} />
      </div>
      <PreviewWeb subject={subject} content={content} integration={integration} />
      <Grid>
        <Grid.Col span={6}>
          <PreviewMobileInbox preheader={preheader} subject={subject} integration={integration} />
        </Grid.Col>
        <Grid.Col span={6}>
          <PreviewMobile subject={subject} content={content} integration={integration} />
        </Grid.Col>
      </Grid>
    </>
  );
};
