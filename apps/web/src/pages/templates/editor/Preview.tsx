import { Grid, JsonInput, useMantineTheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import type { IEmailBlock, MessageTemplateContentType } from '@novu/shared';

import { previewEmail } from '../../../api/content-templates';
import { When } from '../../../components/utils/When';
import { Button, colors } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useProcessVariables } from '../../../hooks';
import { PreviewMobile } from './PreviewMobile';
import { PreviewWeb } from './PreviewWeb';
import { errorMessage } from '../../../utils/notifications';
import { useActiveIntegrations, useIsMultiProviderConfigurationEnabled } from '../../../hooks';

export const Preview = ({ activeStep, view }: { activeStep: number; view: string }) => {
  const { control } = useFormContext();

  const subject = useWatch({
    name: `steps.${activeStep}.template.subject`,
    control,
  });
  const contentType = useWatch({
    name: `steps.${activeStep}.template.contentType`,
    control,
  });
  const htmlContent = useWatch({
    name: `steps.${activeStep}.template.htmlContent`,
    control,
  });
  const editorContent = useWatch({
    name: `steps.${activeStep}.template.content`,
    control,
  });

  const variables = useWatch({
    name: `steps.${activeStep}.template.variables`,
    control,
  });
  const layoutId = useWatch({
    name: `steps.${activeStep}.template.layoutId`,
    control,
  });

  const { integrations = [] } = useActiveIntegrations();
  const isMultiProviderConfigEnabled = useIsMultiProviderConfigurationEnabled();
  const [integration, setIntegration]: any = useState(null);
  const [parsedSubject, setParsedSubject] = useState(subject);
  const [content, setContent] = useState<string>('<html><head></head><body><div></div></body></html>');
  const { isLoading, mutateAsync } = useMutation(previewEmail);
  const processedVariables = useProcessVariables(variables);
  const [payloadValue, setPayloadValue] = useState('{}');

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  const parseContent = (args: {
    contentType: MessageTemplateContentType;
    content: string | IEmailBlock[];
    payload: any;
    layoutId: string;
  }) => {
    mutateAsync({
      ...args,
      payload: JSON.parse(args.payload),
      subject: subject ? subject : '',
    })
      .then((result: { html: string; subject: string }) => {
        setContent(result.html);
        setParsedSubject(result.subject);

        return result;
      })
      .catch((e: any) => {
        errorMessage(e?.message || 'Un-expected error occurred');
      });
  };

  useEffect(() => {
    parseContent({
      contentType,
      content: contentType === 'editor' ? editorContent : htmlContent,
      payload: processedVariables,
      layoutId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, htmlContent, editorContent, processedVariables]);
  const theme = useMantineTheme();

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(
      integrations.find((item) =>
        isMultiProviderConfigEnabled ? item.channel === 'email' && item.primary : item.channel === 'email'
      ) || null
    );
  }, [isMultiProviderConfigEnabled, integrations, setIntegration]);

  return (
    <>
      <Grid>
        <Grid.Col span={9}>
          <When truthy={view === 'web'}>
            <PreviewWeb loading={isLoading} subject={parsedSubject} content={content} integration={integration} />
          </When>
          <When truthy={view === 'mobile'}>
            <Grid>
              <Grid.Col span={12}>
                <PreviewMobile
                  loading={isLoading}
                  subject={parsedSubject}
                  content={content}
                  integration={integration}
                />
              </Grid.Col>
            </Grid>
          </When>
        </Grid.Col>
        <Grid.Col span={3} p={0}>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
              borderRadius: 7,
              padding: 15,
            }}
          >
            <JsonInput
              data-test-id="preview-json-param"
              formatOnBlur
              autosize
              styles={inputStyles}
              label="Payload:"
              value={payloadValue}
              onChange={setPayloadValue}
              minRows={6}
              mb={20}
              validationError="Invalid JSON"
            />
            <Button
              fullWidth
              onClick={() => {
                parseContent({
                  contentType,
                  content: contentType === 'editor' ? editorContent : htmlContent,
                  payload: payloadValue,
                  layoutId,
                });
              }}
              variant="outline"
              data-test-id="apply-variables"
            >
              Apply Variables
            </Button>
          </div>
        </Grid.Col>
      </Grid>
    </>
  );
};
