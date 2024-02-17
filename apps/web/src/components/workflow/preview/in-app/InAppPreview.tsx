import styled from '@emotion/styled';
import { useFormContext, useWatch } from 'react-hook-form';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { usePreviewInAppTemplate } from '../../../../pages/templates/hooks/usePreviewInAppTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import Content from './Content';
import { Header } from './Header';

export function InAppPreview() {
  const { control } = useFormContext<IForm>();
  const path = useStepFormPath();

  const content = useWatch({
    name: `${path}.template.content`,
    control,
  });

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
  });

  const { isPreviewLoading, parsedPreviewState, templateError } = usePreviewInAppTemplate(selectedLocale);

  return (
    <div>
      <ContainerStyled>
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
        />
      </ContainerStyled>
    </div>
  );
}

const ContainerStyled = styled.div`
  display: flex;
  padding: 1rem 5rem;
  flex-direction: column;
  gap: 1rem;
`;
