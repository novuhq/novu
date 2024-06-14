import styled from '@emotion/styled';
import React from 'react';
import { PlusButton } from '@novu/design-system';

const Container = styled.div`
  display: flex;
  justify-content: space-between;
`;

export const TranslationGroupListToolbar = ({
  isLoading,
  onAddGroupClick,
  readonly,
}: {
  isLoading: boolean;
  onAddGroupClick: React.MouseEventHandler<HTMLButtonElement>;
  readonly: boolean;
}) => {
  return (
    <Container>
      <PlusButton
        label="Add group"
        onClick={onAddGroupClick}
        disabled={isLoading || readonly}
        data-test-id="add-translation-group"
      />
    </Container>
  );
};
