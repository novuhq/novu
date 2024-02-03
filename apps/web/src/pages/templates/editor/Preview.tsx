import { Grid, JsonInput, useMantineTheme } from '@mantine/core';
import type { IEmailBlock, MessageTemplateContentType } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button, colors, inputStyles } from '@novu/design-system';
import { previewEmail } from '../../../api/content-templates';
import { getLocalesFromContent } from '../../../api/translations';
import { When } from '../../../components/utils/When';
import { useActiveIntegrations, useAuthController, useProcessVariables } from '../../../hooks';
import { errorMessage } from '../../../utils/notifications';
import type { IForm } from '../components/formTypes';
import { useStepFormErrors } from '../hooks/useStepFormErrors';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { PreviewMobile } from './PreviewMobile';
import { PreviewWeb } from './PreviewWeb';

export const Preview = ({ showVariables = true, view }: { view: string; showVariables?: boolean }) => {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();

  const subject = useWatch({
    name: `${path}.template.subject`,
    control,
  });
  const contentType = useWatch({
    name: `${path}.template.contentType`,
    control,
  });
  const htmlContent = useWatch({
    name: `${path}.template.htmlContent`,
    control,
  });
  const editorContent = useWatch({
    name: `${path}.template.content`,
    control,
  });
  const variables = useWatch({
    name: `${path}.template.variables`,
    control,
  });
  const layoutId = useWatch({
    name: `${path}.template.layoutId`,
    control,
  });

  const { integrations = [] } = useActiveIntegrations();
  const [integration, setIntegration]: any = useState(null);
  const [parsedSubject, setParsedSubject] = useState(subject);
  const [content, setContent] = useState<string>('<html><head></head><body><div></div></body></html>');
  const { isLoading, mutateAsync } = useMutation(previewEmail);
  const { mutateAsync: translationLocales, data: locales } = useMutation(getLocalesFromContent);
  const processedVariables = useProcessVariables(variables);
  const [payloadValue, setPayloadValue] = useState('{}');

  const { organization } = useAuthController();
  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);

  useEffect(() => {
    const emailContent = contentType === 'editor' ? editorContent : htmlContent;
    if (emailContent) {
      translationLocales({
        content: emailContent,
      });
    }
  }, [contentType, editorContent, htmlContent, translationLocales]);

  useEffect(() => {
    setSelectedLocale(organization?.defaultLocale);
  }, [organization?.defaultLocale]);

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  const parseContent = (args: {
    contentType?: MessageTemplateContentType;
    content?: string | IEmailBlock[];
    payload: any;
    layoutId?: string;
    locale?: string;
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
      locale: selectedLocale,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, htmlContent, editorContent, processedVariables, selectedLocale]);
  const theme = useMantineTheme();

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(integrations.find((item) => item.channel === 'email' && item.primary) || null);
  }, [integrations, setIntegration]);

  return (
    <>
      {showVariables ? (
        <>
          <Grid>
            <Grid.Col span={showVariables ? 9 : 12}>
              <When truthy={view === 'web'}>
                <PreviewWeb
                  loading={isLoading}
                  subject={parsedSubject}
                  content={content}
                  integration={integration}
                  error={error}
                  showEditOverlay={!showVariables}
                  setSelectedLocale={setSelectedLocale}
                  locales={locales || []}
                  selectedLocale={selectedLocale}
                />
              </When>
              <When truthy={view === 'mobile'}>
                <Grid>
                  <Grid.Col span={12}>
                    <PreviewMobile
                      loading={isLoading}
                      subject={parsedSubject}
                      content={content}
                      integration={integration}
                      error={error}
                      setSelectedLocale={setSelectedLocale}
                      locales={locales || []}
                      selectedLocale={selectedLocale}
                    />
                  </Grid.Col>
                </Grid>
              </When>
            </Grid.Col>

            <When truthy={showVariables}>
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
            </When>
          </Grid>
        </>
      ) : (
        <PreviewWeb
          loading={isLoading}
          subject={parsedSubject}
          content={content}
          integration={integration}
          error={error}
          showEditOverlay={!showVariables}
          setSelectedLocale={setSelectedLocale}
          locales={locales || []}
          selectedLocale={selectedLocale}
        />
      )}
    </>
  );
};
