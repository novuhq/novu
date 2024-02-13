import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

import { useNavigateToStepEditor } from '../../../../pages/templates/hooks/useNavigateToStepEditor';
import { usePreviewTemplate } from '../../../../pages/templates/hooks/usePreviewTemplate';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { LocaleSelect, MobileSimulator } from '../common';
import { SmsBubble } from './SmsBubble';

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

export const SmsPreview = () => {
  const { navigateToStepEditor } = useNavigateToStepEditor();
  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales();
  const { isPreviewContentLoading, previewContent, templateContentError } = usePreviewTemplate(selectedLocale);

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
        <SmsBubble
          onEditClick={navigateToStepEditor}
          isLoading={isPreviewContentLoading}
          text={previewContent}
          error={templateContentError}
        />
      </BodyContainer>
    </MobileSimulator>
  );
};
