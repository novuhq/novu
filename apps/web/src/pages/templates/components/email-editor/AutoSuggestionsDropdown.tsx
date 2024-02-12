import styled from '@emotion/styled';
import { ScrollArea } from '@mantine/core';
import { colors, shadows } from '@novu/design-system';
import { useEffect, useRef } from 'react';

type AutoSuggestionsDropdownProps = {
  autoSuggestionsCoordinates: {
    top: number;
    left: number;
  };
  onSuggestionsSelect: (value: string) => void;
  variableQuery: string;
  selectedIndex: number;
  variablesList: {
    label: string;
    detail: string;
    insertText: string;
  }[];
};

export function AutoSuggestionsDropdown({
  autoSuggestionsCoordinates,
  onSuggestionsSelect,
  selectedIndex,
  variablesList,
}: AutoSuggestionsDropdownProps) {
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (variablesList.length > 0 && selectedRowRef.current) {
      selectedRowRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
    }
  }, [variablesList, selectedIndex]);

  if (variablesList.length === 0) {
    return null;
  }

  return (
    <Container
      top={autoSuggestionsCoordinates.top}
      left={autoSuggestionsCoordinates.left}
      onClick={(e) => e.stopPropagation()}
      ref={containerRef}
    >
      <ScrollArea w="100%" mah="250px" h="100%" offsetScrollbars pl={10} pt={10}>
        {variablesList.map((variable, index) => (
          <VariableRow
            key={variable.label}
            onClick={(e) => {
              e.stopPropagation();
              onSuggestionsSelect(variable.insertText);
            }}
            isFocussed={selectedIndex === index}
            ref={selectedIndex === index ? selectedRowRef : null}
          >
            {variable.label}
          </VariableRow>
        ))}
      </ScrollArea>
    </Container>
  );
}

const Container = styled.div<{ top: number; left: number }>`
  padding: 5px;
  border-radius: 7px;
  background: ${colors.B20};

  box-shadow: ${shadows.dark};
  position: absolute;
  max-height: 370px;
  width: 475px;
  top: ${({ top }) => top + 20}px;
  left: ${({ left }) => left}px;
  z-index: 3;
  overflow: hidden;
  height: 250px;
`;

const VariableRow = styled.div<{ isFocussed: boolean }>`
  display: flex;
  padding: 10px;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  color: #b18cff;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
    background: ${colors.B30};
  }

  ${({ isFocussed }) =>
    isFocussed &&
    `
    opacity: 0.8;
    background: ${colors.B30};
  `}
`;
