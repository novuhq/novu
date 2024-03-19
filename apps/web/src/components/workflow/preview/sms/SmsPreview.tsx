import styled from '@emotion/styled';
import { colors } from '@novu/design-system';
import { api, useEnvController } from '@novu/shared-web';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { useNavigateToStepEditor } from '../../../../pages/templates/hooks/useNavigateToStepEditor';
import { usePreviewSmsTemplate } from '../../../../pages/templates/hooks/usePreviewSmsTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { LocaleSelect, MobileSimulator } from '../common';
import { SmsBubble } from './SmsBubble';
import { ErrorPrettyRender } from '../ErrorPrettyRender';

const BodyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin: auto 1.25rem 2.5rem 1.25rem;
`;

const LocaleSelectStyled = styled(LocaleSelect)`
  .mantine-Select-input {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)};
  }

  .mantine-Input-rightSection {
    color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B60)} !important;
  }
`;

export const SmsPreview = ({
  showPreviewAsLoading = false,
  inputVariables,
}: {
  showPreviewAsLoading?: boolean;
  inputVariables?: any;
}) => {
  const { navigateToStepEditor } = useNavigateToStepEditor();
  const { watch, formState } = useFormContext<IForm>();
  const { template } = useTemplateEditorForm();
  const { chimera } = useEnvController({}, template?.chimera);
  const path = useStepFormPath();
  const templateContent = watch(`${path}.template.content`);
  const { pathname } = useLocation();
  const isPreviewPath = pathname.endsWith('/preview');
  const stepId = watch(`${path}.uuid`);
  const [chimeraContent, setChimeraContent] = useState('');

  const {
    mutateAsync,
    isLoading: isChimeraLoading,
    error: previewError,
  } = useMutation((data) => api.post('/v1/echo/preview/' + formState?.defaultValues?.identifier + '/' + stepId, data), {
    onSuccess(data) {
      setChimeraContent(data.outputs.body);
    },
  });

  useEffect(() => {
    if (chimera) {
      mutateAsync(inputVariables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimera, inputVariables]);

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: templateContent as string,
    disabled: showPreviewAsLoading,
  });

  const { isPreviewContentLoading, previewContent, templateError } = usePreviewSmsTemplate(
    selectedLocale,
    showPreviewAsLoading || chimera
  );

  return (
    <MobileSimulator withBackground={false}>
      <BodyContainer>
        <LocaleSelectStyled
          isLoading={areLocalesLoading}
          locales={locales}
          value={selectedLocale}
          onLocaleChange={onLocaleChange}
          dropdownPosition="top"
        />

        {previewError && chimera ? (
          <div style={{ marginTop: 20, padding: 10 }}>
            <ErrorPrettyRender error={previewError} />
          </div>
        ) : (
          <SmsBubble
            onEditClick={navigateToStepEditor}
            isLoading={chimera ? isChimeraLoading : isPreviewContentLoading || areLocalesLoading}
            text={chimera ? chimeraContent : previewContent}
            error={chimera ? undefined : templateError}
            withOverlay={isPreviewPath}
          />
        )}
      </BodyContainer>
    </MobileSimulator>
  );
};
