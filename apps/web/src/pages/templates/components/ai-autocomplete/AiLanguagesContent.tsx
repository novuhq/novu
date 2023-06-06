import styled from '@emotion/styled';

import { Dropdown } from '../../../../design-system';
import { EditIcon } from './EditIcon';

const ItemHolder = styled.div`
  display: flex;
  gap: 8px;
`;

const SuggestionText = styled.span`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const LANGUAGES = {
  en: 'English',
  ru: 'Russian',
  pl: 'Polish',
};

interface AIAutocompleteContentProps {
  onLanguageClick: (value: string) => void;
}

export const AiLanguagesContent = ({ onLanguageClick }: AIAutocompleteContentProps) => {
  return (
    <>
      {Object.keys(LANGUAGES).map((lang) => (
        <Dropdown.Item key={lang} onClick={() => onLanguageClick(lang)}>
          <ItemHolder>
            <EditIcon style={{ minWidth: 16 }} />
            <SuggestionText title={lang}>{LANGUAGES[lang]}</SuggestionText>
          </ItemHolder>
        </Dropdown.Item>
      ))}
    </>
  );
};
