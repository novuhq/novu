import React from 'react';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { TenantsList } from './components/list/TenantsList';

export function Tenants() {
  return (
    <>
      <PageContainer title="Tenants">
        <PageHeader title="Tenants" />
        <TenantsList />
      </PageContainer>
    </>
  );
}
