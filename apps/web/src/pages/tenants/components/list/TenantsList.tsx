import { useState } from 'react';
import { Container } from '@mantine/core';
import { Row } from 'react-table';
import { ITenantEntity } from '@novu/shared';

import { Table, When } from '@novu/design-system';
import { columns } from './columns';
import { useTenants } from '../../../../hooks/useTenants';
import { Toolbar } from './ToolBar';
import { TenantsListNoData } from './TenantsListNoData';

export const TenantsList = ({
  onAddTenantClick,
  onRowClickCallback,
}: {
  onAddTenantClick: React.MouseEventHandler<HTMLButtonElement>;
  onRowClickCallback: (row: Row<ITenantEntity>) => void;
}) => {
  const [page, setPage] = useState<number>(0);
  const { tenants, pageSize, hasMore, loading, ...ten } = useTenants({ page });

  const hasTenants = tenants && tenants?.length > 0;
  const loadingPhase = hasTenants || loading;
  const noTenants = !hasTenants && !loading;

  function handleTableChange(pageIndex) {
    setPage(pageIndex);
  }

  return (
    <>
      <Container fluid sx={{ padding: '0 24px 8px 24px' }}>
        <Toolbar onAddTenantClick={onAddTenantClick} tenantLoading={loading} />
      </Container>
      <When truthy={loadingPhase}>
        <Table
          onRowClick={onRowClickCallback}
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
    </>
  );
};
