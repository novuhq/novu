import { JsonInput } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from '@emotion/styled';
import { Button, colors, inputStyles } from '@novu/design-system';

import { useActiveIntegrations, useProcessVariables } from '../../../../hooks';
import type { IForm } from '../../../../pages/templates/components/formTypes';
import { useStepFormErrors } from '../../../../pages/templates/hooks/useStepFormErrors';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { When } from '../../../utils/When';
import { PreviewMobile } from './PreviewMobile';
import { PreviewWeb } from './PreviewWeb';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { usePreviewEmailTemplate } from '../../../../pages/templates/hooks/usePreviewEmailTemplate';

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
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();
  const error = useStepFormErrors();

  const contentType = watch(`${path}.template.contentType`);
  const htmlContent = watch(`${path}.template.htmlContent`);
  const editorContent = watch(`${path}.template.content`);
  const variables = watch(`${path}.template.variables`);
  const processedVariables = useProcessVariables(variables);
  const content = contentType === 'editor' ? editorContent : htmlContent;
  const [payloadValue, setPayloadValue] = useState(processedVariables ?? '{}');

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content,
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
    setPayloadValue(processedVariables);
  }, [setPayloadValue, processedVariables]);

  const isLoading = isPreviewContentLoading || areLocalesLoading;

  return (
    <>
      {showVariables ? (
        <PreviewContainer>
          <When truthy={view === 'web'}>
            <PreviewWeb
              loading={isLoading}
              subject={subject}
              content={previewContent}
              integration={integration}
              error={error}
              showEditOverlay={false}
              onLocaleChange={onLocaleChange}
              locales={locales || []}
              selectedLocale={selectedLocale}
            />
          </When>
          <When truthy={view === 'mobile'}>
            <PreviewMobile
              loading={isLoading}
              subject={subject}
              content={previewContent}
              integration={integration}
              error={error}
              onLocaleChange={onLocaleChange}
              locales={locales || []}
              selectedLocale={selectedLocale}
            />
          </When>
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
        </PreviewContainer>
      ) : (
        <PreviewWeb
          loading={isLoading}
          subject={subject}
          content={previewContent}
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
