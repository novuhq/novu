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

export function InAppPreview({ showVariables = true }: { showVariables?: boolean }) {
  const theme = useMantineTheme();
  const [payloadValue, setPayloadValue] = useState('{}');
  const { watch } = useFormContext<IForm>();
  const path = useStepFormPath();

  const content = watch(`${path}.template.content`);
  const variables = watch(`${path}.template.variables`);
  const enableAvatar = watch(`${path}.template.enableAvatar`);
  const processedVariables = useProcessVariables(variables);

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
            areLocalesLoading={areLocalesLoading}
            onLocaleChange={onLocaleChange}
          />
          <Content
            isPreviewLoading={isPreviewLoading}
            parsedPreviewState={parsedPreviewState}
            templateError={templateError}
            showOverlay={!showVariables}
            enableAvatar={enableAvatar}
          />
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
          </div>
        </Grid.Col>
      </When>
    </Grid>
  );
}

const ContainerStyled = styled.div<{ removePadding: boolean }>`
  display: flex;
  padding: 1rem 5rem;
  flex-direction: column;
  gap: 1rem;

  ${({ removePadding }) => removePadding && `padding: 0;`}
`;
