import styled from '@emotion/styled';
import React from 'react';

import { PlusButton } from '@novu/design-system';

const IntegrationsListToolbarHolder = styled.div`
  display: flex;
  justify-content: space-between;
`;

export const IntegrationsListToolbar = ({
  areIntegrationsLoading,
  onAddProviderClick,
}: {
  areIntegrationsLoading: boolean;
  onAddProviderClick: React.MouseEventHandler<HTMLButtonElement>;
}) => {
  return (
    <IntegrationsListToolbarHolder>
      <PlusButton
        label="Add a provider"
        onClick={onAddProviderClick}
        disabled={areIntegrationsLoading}
        data-test-id="add-provider"
      />
    </IntegrationsListToolbarHolder>
  );
};
