import styled from '@emotion/styled';
import { colors } from '@novu/design-system';
import { MouseEventHandler } from 'react';
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

export const SmsBasePreview = ({
  content,
  loading = false,
  error,
  showEditOverlay = false,
  onLocaleChange,
  selectedLocale,
  locales,
  onEditClick,
}: {
  content: string;
  loading?: boolean;
  error?: string;
  showEditOverlay?: boolean;
  onLocaleChange: (locale: string) => void;
  selectedLocale?: string;
  locales: any[];
  onEditClick?: MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <MobileSimulator withBackground={false}>
      <BodyContainer>
        <LocaleSelectStyled
          isLoading={loading}
          locales={locales}
          value={selectedLocale}
          onLocaleChange={onLocaleChange}
          dropdownPosition="top"
        />
        <SmsBubble
          onEditClick={onEditClick}
          isLoading={loading}
          text={content}
          error={error}
          withOverlay={showEditOverlay}
        />
      </BodyContainer>
    </MobileSimulator>
  );
};
