import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';

import { colors, Dropdown } from '../../../../design-system';
import { EditIcon } from './EditIcon';

const PanelHolder = styled(Skeleton)`
  width: 100%;
  height: 40px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B80)};
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;

  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;

const ItemHolder = styled.div`
  display: flex;
  gap: 8px;
`;

const SuggestionText = styled.span`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

interface AIAutocompleteContentProps {
  isLoading: boolean;
  suggestions?: Array<{ content: string }>;
  onSuggestionClick: (value: string) => void;
}

export const AiAutocompleteContent = ({ isLoading, suggestions, onSuggestionClick }: AIAutocompleteContentProps) => {
  if (isLoading || !suggestions || suggestions.length === 0) {
    return (
      <>
        <PanelHolder />
        <PanelHolder />
        <PanelHolder />
      </>
    );
  }

  return (
    <>
      {suggestions.map((suggestion) => (
        <Dropdown.Item key={suggestion.content} onClick={() => onSuggestionClick(suggestion.content)}>
          <ItemHolder>
            <EditIcon style={{ minWidth: 16 }} />
            <SuggestionText title={suggestion.content}>{suggestion.content}</SuggestionText>
          </ItemHolder>
        </Dropdown.Item>
      ))}
    </>
  );
};
