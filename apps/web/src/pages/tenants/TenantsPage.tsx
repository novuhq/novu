import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { TenantsList } from './components/list/TenantsList';

export function TenantsPage() {
  const navigate = useNavigate();

  const onAddTenantClickCallback = useCallback(() => {
    // navigate();
  }, [navigate]);

  return (
    <PageContainer title="Tenants">
      <PageHeader title="Tenants" />
      <TenantsList onAddTenantClick={onAddTenantClickCallback} />
    </PageContainer>
  );
}
