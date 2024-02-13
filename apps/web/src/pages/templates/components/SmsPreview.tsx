import styled from '@emotion/styled';
import { colors } from '@novu/design-system';

import { LocaleSelect } from '../../../components/workflow/Preview/common';
import { usePreviewSmsTemplate } from '../hooks/usePreviewSmsTemplate';
import { useNavigateToStepEditor } from '../hooks/useNavigateToStepEditor';
import { useTemplateLocales } from '../hooks/useTemplateLocales';
import { MobileSimulator } from './phone-simulator';
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
  const { isPreviewContentLoading, previewContent, templateContentError } = usePreviewSmsTemplate(selectedLocale);

  return (
    <MobileSimulator>
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
