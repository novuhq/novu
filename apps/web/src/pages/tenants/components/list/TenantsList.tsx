import { useState } from 'react';
import { Container } from '@mantine/core';

import { Table } from '../../../../design-system';
import PageContainer from '../../../../components/layout/components/PageContainer';
import { When } from '../../../../components/utils/When';
import { columns } from './columns';
import { useTenants } from '../../../../hooks/useTenants';
import { Toolbar } from './ToolBar';
import { TenantsListNoData } from './TenantsListNoData';

export const TenantsList = ({ onAddTenantClick }: { onAddTenantClick: React.MouseEventHandler<HTMLButtonElement> }) => {
  const [page, setPage] = useState<number>(0);
  const { tenants, pageSize, hasMore, loading, ...ten } = useTenants({ page });

  const hasTenants = tenants && tenants?.length > 0;
  const loadingPhase = hasTenants || loading;
  const noTenants = !hasTenants && !loading;

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  return (
    <PageContainer
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
      title="Tenants"
    >
      <Container fluid sx={{ padding: '0 30px 8px 30px' }}>
        <Toolbar onAddTenantClick={onAddTenantClick} tenantLoading={loading} />
      </Container>
      <When truthy={loadingPhase}>
        <Table
          loading={loading}
          data-test-id="tenants-list-table"
          columns={columns}
          data={tenants || []}
          pagination={{
            pageSize: pageSize,
            current: page,
            hasMore,
            minimalPagination: true,
            onPageChange: handleTableChange,
          }}
        />
      </When>
      <When truthy={noTenants}>
        <TenantsListNoData />
      </When>
    </PageContainer>
  );
};
