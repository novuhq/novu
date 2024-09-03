import { Grid, JsonInput, useMantineTheme } from '@mantine/core';
import { Button, colors, inputStyles, When } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { IMessageButton, inAppMessageFromBridgeOutputs } from '@novu/shared';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { usePreviewInAppTemplate } from '../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { useProcessVariables } from '../../../../hooks';
import { api } from '../../../../api';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { ControlVariablesForm } from '../../../../pages/templates/components/ControlVariablesForm';
import { InAppBasePreview } from './InAppBasePreview';

export function InAppPreview({ showVariables = true }: { showVariables?: boolean }) {
  const theme = useMantineTheme();
  const [payloadValue, setPayloadValue] = useState('{}');
  const { watch, formState } = useFormContext<IForm>();
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvironment({ bridge: template?.bridge });
  const path = useStepFormPath();

  const content = watch(`${path}.template.content`);
  const variables = watch(`${path}.template.variables`);
  const enableAvatar = watch(`${path}.template.enableAvatar`);
  const processedVariables = useProcessVariables(variables);

  const stepId = watch(`${path}.uuid`);
  const [bridgeContent, setBridgeContent] = useState<{
    content: string;
    ctaButtons: Array<IMessageButton>;
    subject?: string;
    avatar?: string;
  }>({
    content: '',
    ctaButtons: [],
    subject: '',
    avatar: '',
  });

  const { mutateAsync, isLoading: isBridgeLoading } = useMutation(
    (data) => api.post(`/v1/bridge/preview/${formState?.defaultValues?.identifier}/${stepId}`, data),
    {
      onSuccess(data) {
        const inAppMessage = inAppMessageFromBridgeOutputs(data.outputs);
        setBridgeContent({
          subject: inAppMessage.subject,
          content: inAppMessage.content,
          avatar: inAppMessage.avatar,
          ctaButtons: inAppMessage.cta.action.buttons,
        });
      },
    }
  );

  useEffect(() => {
    if (bridge) {
      mutateAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge]);

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
  });

  const { isPreviewLoading, parsedPreviewState, templateError, parseInAppContent } = usePreviewInAppTemplate({
    locale: selectedLocale,
  });

  useEffect(() => {
    setPayloadValue(processedVariables);
  }, [processedVariables, setPayloadValue]);

  return (
    <Grid gutter={24}>
      <Grid.Col span={showVariables ? 8 : 12}>
        <InAppBasePreview
          content={bridge ? bridgeContent : parsedPreviewState}
          onLocaleChange={onLocaleChange}
          locales={locales}
          error={bridge ? '' : templateError}
          enableAvatar={enableAvatar}
          selectedLocale={selectedLocale}
          showEditOverlay={!showVariables}
          loading={areLocalesLoading || isBridgeLoading || isPreviewLoading}
        />
      </Grid.Col>

      <When truthy={showVariables}>
        <Grid.Col span={4}>
          <div
            style={{
              width: '100%',
              height: '100%',
              background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
              borderRadius: 7,
              padding: 15,
              paddingTop: 0,
            }}
          >
            <When truthy={!bridge}>
              <JsonInput
                data-test-id="preview-json-param"
                formatOnBlur
                autosize
                styles={inputStyles}
                label="Payload"
                value={payloadValue}
                onChange={setPayloadValue}
                minRows={6}
                mb={20}
                validationError="Invalid JSON"
              />
              <Button
                fullWidth
                onClick={() => {
                  parseInAppContent(payloadValue);
                }}
                variant="outline"
                data-test-id="apply-variables"
              >
                Apply Variables
              </Button>
            </When>
            <When truthy={bridge}>
              <ControlVariablesForm
                onChange={(values) => {
                  mutateAsync(values);
                }}
              />
            </When>
          </div>
        </Grid.Col>
      </When>
    </Grid>
  );
}
