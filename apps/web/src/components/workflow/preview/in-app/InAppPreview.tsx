import styled from '@emotion/styled';
import { Grid, JsonInput, useMantineTheme } from '@mantine/core';
import { Button, colors, inputStyles, When } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { usePreviewInAppTemplate } from '../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import Content from './Content';
import { Header } from './Header';
import { useProcessVariables } from '../../../../hooks';
import { api } from '../../../../api';
import { useEnvController } from '../../../../hooks/useEnvController';
import { useMutation } from '@tanstack/react-query';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { InputVariablesForm } from '../../../../pages/templates/components/InputVariablesForm';
import { ErrorPrettyRender } from '../ErrorPrettyRender';

export function InAppPreview({ showVariables = true }: { showVariables?: boolean }) {
  const theme = useMantineTheme();
  const [payloadValue, setPayloadValue] = useState('{}');
  const { watch, formState } = useFormContext<IForm>();
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvController({}, template?.bridge);
  const path = useStepFormPath();

  const content = watch(`${path}.template.content`);
  const variables = watch(`${path}.template.variables`);
  const enableAvatar = watch(`${path}.template.enableAvatar`);
  const processedVariables = useProcessVariables(variables);

  const stepId = watch(`${path}.uuid`);
  const [bridgeContent, setBridgeContent] = useState({ content: '', ctaButtons: [] });

  const {
    mutateAsync,
    isLoading: isBridgeLoading,
    error: previewError,
  } = useMutation((data) => api.post('/v1/echo/preview/' + formState?.defaultValues?.identifier + '/' + stepId, data), {
    onSuccess(data) {
      setBridgeContent({
        content: data.outputs.body,
        ctaButtons: [],
      });
    },
  });

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
        <ContainerStyled removePadding={showVariables}>
          <Header
            selectedLocale={selectedLocale}
            locales={locales}
            areLocalesLoading={areLocalesLoading || isBridgeLoading}
            onLocaleChange={onLocaleChange}
          />
          {previewError && bridge ? (
            <ErrorPrettyRender error={previewError} />
          ) : (
            <Content
              isPreviewLoading={isPreviewLoading || isBridgeLoading}
              parsedPreviewState={bridge ? bridgeContent : parsedPreviewState}
              templateError={bridge ? '' : templateError}
              showOverlay={!showVariables}
              enableAvatar={enableAvatar}
            />
          )}
        </ContainerStyled>
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
              <InputVariablesForm
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

const ContainerStyled = styled.div<{ removePadding: boolean }>`
  width: 27.5rem;
  display: flex;
  margin: 1rem auto;
  flex-direction: column;
  gap: 1rem;

  ${({ removePadding }) => removePadding && `padding: 0;`}
`;
