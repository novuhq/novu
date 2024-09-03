import { JsonInput } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { Button, colors, inputStyles } from '@novu/design-system';

import { useMutation } from '@tanstack/react-query';
import { useActiveIntegrations, useProcessVariables } from '../../../../hooks';
import type { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormErrors } from '../../../../pages/templates/hooks/useStepFormErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { When } from '../../../utils/When';
import { PreviewMobile } from './PreviewMobile';
import { PreviewWeb } from './PreviewWeb';
import { api } from '../../../../api';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { usePreviewEmailTemplate } from '../../../../pages/templates/hooks/usePreviewEmailTemplate';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { ControlVariablesForm } from '../../../../pages/templates/components/ControlVariablesForm';
import { ErrorPrettyRender } from '../ErrorPrettyRender';

const PreviewContainer = styled.div`
  display: flex;
  flex-wrap: nowrap;
  height: 100%;
  margin: 0;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
`;

const JSONContainer = styled.div`
  min-width: 28rem;
  height: 100%;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B17 : colors.B98)};
  border-radius: 7;
`;

export const EmailPreview = ({ showVariables = true, view }: { view: string; showVariables?: boolean }) => {
  const { watch, formState } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvironment({ bridge: template?.bridge });

  const stepId = watch(`${path}.uuid`);

  const contentType = watch(`${path}.template.contentType`);
  const htmlContent = watch(`${path}.template.htmlContent`);
  const editorContent = watch(`${path}.template.content`);
  const variables = watch(`${path}.template.variables`);
  const processedVariables = useProcessVariables(variables);
  const content = contentType === 'editor' ? editorContent : htmlContent;
  const [payloadValue, setPayloadValue] = useState(processedVariables ?? '{}');
  const [bridgeContent, setBridgeContent] = useState('');
  const [bridgeSubject, setBridgeSubject] = useState('');

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content,
  });

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put(`/v1/bridge/controls/${formState?.defaultValues?.identifier}/${stepId}`, { variables: data })
  );

  const {
    mutateAsync,
    isLoading: isBridgeLoading,
    error: previewError,
  } = useMutation((data) => api.post(`/v1/bridge/preview/${formState?.defaultValues?.identifier}/${stepId}`, data), {
    onSuccess(data) {
      setBridgeContent(data.outputs.body);
      setBridgeSubject(data.outputs.subject);
    },
  });

  const { getEmailPreview, previewContent, subject, isPreviewContentLoading } = usePreviewEmailTemplate({
    locale: selectedLocale,
    payload: processedVariables,
  });
  const { integrations = [] } = useActiveIntegrations();
  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);

  useEffect(() => {
    if (bridge && !showVariables) {
      mutateAsync(JSON.parse(processedVariables));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedVariables, bridge]);

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [setPayloadValue, processedVariables]);

  const isLoading = isPreviewContentLoading || areLocalesLoading || isBridgeLoading;

  return (
    <>
      {showVariables ? (
        <PreviewContainer>
          <When truthy={previewError}>
            <ErrorPrettyRender error={previewError} />
          </When>
          <When truthy={view === 'web' && !previewError}>
            <PreviewWeb
              loading={isLoading}
              subject={bridgeSubject || subject}
              content={bridgeContent || previewContent}
              integration={integration}
              error={error}
              showEditOverlay={false}
              onLocaleChange={onLocaleChange}
              locales={locales || []}
              selectedLocale={selectedLocale}
              bridge={bridge}
            />
          </When>
          <When truthy={view === 'mobile' && !previewError}>
            <PreviewMobile
              loading={isLoading}
              subject={bridgeSubject || subject}
              content={bridgeContent || previewContent}
              integration={integration}
              error={error}
              onLocaleChange={onLocaleChange}
              locales={locales || []}
              selectedLocale={selectedLocale}
              bridge={bridge}
            />
          </When>
          <When truthy={!bridge}>
            <JSONContainer>
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
                  getEmailPreview(payloadValue);
                }}
                variant="outline"
                data-test-id="apply-variables"
              >
                Apply Variables
              </Button>
            </JSONContainer>
          </When>
          <When truthy={bridge}>
            <div style={{ minWidth: 300, maxWidth: 300, marginLeft: 'auto' }}>
              <ControlVariablesForm
                onChange={(values) => {
                  mutateAsync(values);
                }}
              />
            </div>
          </When>
        </PreviewContainer>
      ) : (
        <PreviewWeb
          loading={isLoading}
          subject={bridgeSubject || subject}
          content={bridgeContent || previewContent}
          integration={integration}
          error={error}
          showEditOverlay={!showVariables}
          onLocaleChange={onLocaleChange}
          locales={locales || []}
          selectedLocale={selectedLocale}
          bridge={bridge}
        />
      )}
    </>
  );
};
