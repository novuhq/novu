import { TypeAnimation } from 'react-type-animation';
import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { colors, Dropdown } from '../../../../design-system';
import { EditIcon } from './EditIcon';
import { getAiAutosuggestions } from '../../../../api/auto-suggestions';

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
  title: string;
  channel: string;
  value: string;
  onSuggestionClick: (value: string) => void;
}

export const AiAutocompleteContent = ({ title, channel, value, onSuggestionClick }: AIAutocompleteContentProps) => {
  const { data, isLoading } = useQuery<{ answer: Array<{ content: string }> }>(
    ['get-ai-suggestions', value],
    () => getAiAutosuggestions({ description: value, channel, title }),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading || !data || data.answer.length === 0) {
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
      {data.answer.map((suggestion) => (
        <Dropdown.Item key={suggestion.content} onClick={() => onSuggestionClick(suggestion.content)}>
          <ItemHolder>
            <EditIcon style={{ minWidth: 16 }} />
            <SuggestionText>{suggestion.content}</SuggestionText>
          </ItemHolder>
        </Dropdown.Item>
      ))}
    </>
  );
};
