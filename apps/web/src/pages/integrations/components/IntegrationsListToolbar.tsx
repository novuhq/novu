import styled from '@emotion/styled';
import React from 'react';
import PageHeaderToolbar from './PageHeaderToolbar';

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
      <PageHeaderToolbar label="Add a provider" onClick={onAddProviderClick} disabled={areIntegrationsLoading} />
    </IntegrationsListToolbarHolder>
  );
};
