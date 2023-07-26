import { Container } from '@mantine/core';

import { Table } from '../../../../design-system';
import PageContainer from '../../../../components/layout/components/PageContainer';
import { When } from '../../../../components/utils/When';
import { columns } from './columns';
import { useTenants } from '../../../../hooks/useTenants';
import { Toolbar } from './ToolBar';

export const TenantsList = ({ onAddTenantClick }: { onAddTenantClick: React.MouseEventHandler<HTMLButtonElement> }) => {
  const { tenants, loading } = useTenants();
  const hasTenants = tenants && tenants?.length > 0;

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
      <When truthy={hasTenants || loading}>
        <Table loading={loading} data-test-id="tenants-list-table" columns={columns} data={tenants || []} />
      </When>
    </PageContainer>
  );
};
