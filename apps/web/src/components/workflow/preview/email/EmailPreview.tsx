import { Grid, JsonInput, useMantineTheme } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button, colors, inputStyles } from '@novu/design-system';

import { IS_DOCKER_HOSTED, useDataRef } from '@novu/shared-web';
import { useGetLocalesFromContent, usePreviewEmail } from '../../../../api/hooks';
import { useActiveIntegrations, useAuthController, useProcessVariables } from '../../../../hooks';
import type { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormErrors } from '../../../../pages/templates/hooks/useStepFormErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { When } from '../../../utils/When';
import { PreviewMobile } from './PreviewMobile';
import { PreviewWeb } from './PreviewWeb';

export const EmailPreview = ({ showVariables = true, view }: { view: string; showVariables?: boolean }) => {
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

  const [parsedPreviewState, setParsedPreviewState] = useState({
    subject: subject,
    content: '<html><head></head><body><div></div></body></html>',
  });

  const { isLoading, getEmailPreview } = usePreviewEmail({
    onSuccess: (result) => {
      setParsedPreviewState({
        content: result.html,
        subject: result.subject,
      });
    },
  });

  const { data: locales, getLocalesFromContent } = useGetLocalesFromContent();
  const processedVariables = useProcessVariables(variables);
  const [payloadValue, setPayloadValue] = useState('{}');

  const { organization } = useAuthController();
  const [selectedLocale, setSelectedLocale] = useState<string | undefined>(undefined);

  const previewData = useDataRef({ contentType, htmlContent, editorContent, layoutId, subject });

  useEffect(() => {
    const emailContent =
      previewData.current.contentType === 'editor'
        ? previewData.current.editorContent
        : previewData.current.htmlContent;

    if (emailContent && !IS_DOCKER_HOSTED) {
      getLocalesFromContent({
        content: emailContent,
      });
    }
  }, [getLocalesFromContent, previewData]);

  useEffect(() => {
    setSelectedLocale(organization?.defaultLocale);
  }, [organization?.defaultLocale]);

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  const parseContent = useCallback(
    (args: { payload: any }) => {
      getEmailPreview({
        ...args,
        contentType: previewData.current.contentType,
        content:
          previewData.current.contentType === 'editor'
            ? previewData.current.editorContent
            : previewData.current.htmlContent,
        layoutId: previewData.current.layoutId,
        payload: JSON.parse(args.payload),
        subject: previewData.current.subject ?? '',
        locale: selectedLocale,
      });
    },
    [getEmailPreview, previewData, selectedLocale]
  );

  useEffect(() => {
    parseContent({
      payload: processedVariables,
    });
  }, [parseContent, previewData, processedVariables, selectedLocale]);

  const theme = useMantineTheme();

  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);

  const onLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
  };

  return (
    <>
      {showVariables ? (
        <Grid>
          <Grid.Col span={9}>
            <When truthy={view === 'web'}>
              <PreviewWeb
                loading={isLoading}
                subject={parsedPreviewState.subject}
                content={parsedPreviewState.content}
                integration={integration}
                error={error}
                showEditOverlay={false}
                onLocaleChange={onLocaleChange}
                locales={locales || []}
                selectedLocale={selectedLocale}
              />
            </When>
            <When truthy={view === 'mobile'}>
              <Grid>
                <Grid.Col span={12}>
                  <PreviewMobile
                    loading={isLoading}
                    subject={parsedPreviewState.subject}
                    content={parsedPreviewState.content}
                    integration={integration}
                    error={error}
                    onLocaleChange={onLocaleChange}
                    locales={locales || []}
                    selectedLocale={selectedLocale}
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
                    payload: payloadValue,
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
      ) : (
        <PreviewWeb
          loading={isLoading}
          subject={parsedPreviewState.subject}
          content={parsedPreviewState.content}
          integration={integration}
          error={error}
          showEditOverlay={!showVariables}
          onLocaleChange={onLocaleChange}
          locales={locales || []}
          selectedLocale={selectedLocale}
        />
      )}
    </>
  );
};
